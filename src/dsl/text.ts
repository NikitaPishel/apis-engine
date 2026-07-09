/** Unescapes any \X sequence to the literal character X. */
export function unescape(text: string): string {
	return text.replace(/\\(.)/g, '$1');
}
