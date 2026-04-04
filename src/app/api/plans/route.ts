export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
    createPlan,
    deletePlan,
    getPlans,
    updatePlan,
} from '@/src/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const plan = await createPlan({
            date: body.date,
            recipeId: body.recipeId,
            notes: body.notes,
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Error adding plan:', error);
        return NextResponse.json({ error: 'Failed to add plan' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const minDate = searchParams.get('minDate');
        const maxDate = searchParams.get('maxDate');

        const plans = minDate && maxDate
            ? await getPlans(minDate, maxDate)
            : await getPlans();

        return NextResponse.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        const plan = await updatePlan(id, {
            date: data.date,
            recipeId: data.recipeId,
            notes: data.notes,
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Error updating plan:', error);
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
        }

        await deletePlan(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting plan:', error);
        return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
    }
}
