import { DiagramType } from './model';
import { DiagramSyntaxError } from './errors';
import { unescape } from './text';

export interface ParsedHeader {
	type: DiagramType;
	title: string;
	bodyStartLine: number;
}

const TAG_LINE = /^#(\w+)\s*\(([^)]*)\)\s*$/;

/**
 * Reads the leading run of "#tag (value)" lines. Tags must precede every other
 * diagram element; the DSL has no other use for a line-leading "#" (comments
 * were removed), so the first non-tag, non-blank line ends the header.
 */
export function parseHeader(lines: string[]): ParsedHeader {
	let type: DiagramType | undefined;
	let title = '';
	let bodyStartLine = lines.length;

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (!trimmed) {
			continue;
		}
		if (!trimmed.startsWith('#')) {
			bodyStartLine = i;
			break;
		}

		const match = trimmed.match(TAG_LINE);
		if (!match) {
			throw new DiagramSyntaxError(`Malformed tag "${trimmed}" (expected "#name (value)")`, i + 1);
		}

		const [, name, rawValue] = match;
		const value = unescape(rawValue.trim());

		if (name === 'type') {
			if (value !== 'structure' && value !== 'flowchart') {
				throw new DiagramSyntaxError(`Unknown diagram type "${value}" (expected "structure" or "flowchart")`, i + 1);
			}
			type = value;
		} else if (name === 'title') {
			title = value;
		} else {
			throw new DiagramSyntaxError(`Unknown tag "#${name}"`, i + 1);
		}
	}

	if (!type) {
		throw new DiagramSyntaxError('Missing required "#type (structure|flowchart)" tag', 1);
	}

	return { type, title, bodyStartLine };
}
