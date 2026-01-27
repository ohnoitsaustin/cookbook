export function weatherCodeToEmoji(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌦️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    return '⛈️';
}

export const getCurrentSeason = (): string => {
    const month = new Date().getMonth(); // 0-11

    if (month >= 2 && month <= 4) return 'spring';  // March-May
    if (month >= 5 && month <= 7) return 'summer';  // June-August
    if (month >= 8 && month <= 10) return 'fall';   // September-November
    return 'winter'; // December-February
};