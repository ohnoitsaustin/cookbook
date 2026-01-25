export const getCurrentSeason = (): string => {
    const month = new Date().getMonth(); // 0-11

    if (month >= 2 && month <= 4) return 'spring';  // March-May
    if (month >= 5 && month <= 7) return 'summer';  // June-August
    if (month >= 8 && month <= 10) return 'fall';   // September-November
    return 'winter'; // December-February
};