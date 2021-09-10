export const timeout = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
