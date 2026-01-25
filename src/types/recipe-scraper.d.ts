declare module 'recipe-scraper' {
    function recipeScraper(url: string): Promise<{
        name?: string;
        ingredients?: string[];
        instructions?: string;
        time?: {
            prep?: string;
            cook?: string;
            total?: string;
        };
        image?: string;
        servings?: string;
    }>;

    export default recipeScraper;
}