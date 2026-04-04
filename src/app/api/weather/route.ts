export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getWeatherCache, upsertWeatherCache } from '@/src/lib/supabase';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!startDate || !endDate || !lat || !lng) {
            return NextResponse.json(
                { error: 'Missing required parameters: startDate, endDate, lat, lng' },
                { status: 400 }
            );
        }

        // Generate all dates in range
        const dates: string[] = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        // Check cache
        const cached = await getWeatherCache(dates);
        const now = Date.now();
        const freshCache: Record<string, { high: number; low: number; weather_code: number }> = {};
        const staleDates: string[] = [];

        for (const date of dates) {
            const entry = cached.find(c => c.date === date);
            if (entry) {
                const age = now - new Date(entry.updated_at).getTime();
                if (age < CACHE_MAX_AGE_MS) {
                    freshCache[date] = {
                        high: entry.high,
                        low: entry.low,
                        weather_code: entry.weather_code,
                    };
                } else {
                    staleDates.push(date);
                }
            } else {
                staleDates.push(date);
            }
        }

        // Fetch missing/stale data from API
        if (staleDates.length > 0) {
            const minStale = staleDates.sort()[0];
            const maxStale = staleDates.sort()[staleDates.length - 1];

            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&start_date=${minStale}&end_date=${maxStale}`
            );
            const data = await res.json();

            if (data.daily?.time) {
                const toCache: { date: string; high: number; low: number; weather_code: number }[] = [];

                data.daily.time.forEach((date: string, i: number) => {
                    if (staleDates.includes(date)) {
                        const entry = {
                            date,
                            high: Math.round(data.daily.temperature_2m_max[i]),
                            low: Math.round(data.daily.temperature_2m_min[i]),
                            weather_code: data.daily.weather_code[i],
                        };
                        freshCache[date] = {
                            high: entry.high,
                            low: entry.low,
                            weather_code: entry.weather_code,
                        };
                        toCache.push(entry);
                    }
                });

                // Save to cache (fire and forget)
                upsertWeatherCache(toCache).catch(console.error);
            }
        }

        return NextResponse.json(freshCache);
    } catch (error) {
        console.error('Error fetching weather:', error);
        return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
    }
}
