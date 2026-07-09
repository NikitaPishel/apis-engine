export class DiagramSyntaxError extends Error {
	constructor(reason: string, public readonly line: number) {
		super(`Line ${line}: ${reason}`);
		this.name = 'DiagramSyntaxError';
	}
}
