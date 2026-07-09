import { Diagram } from './diagram';
import { FlowchartDiagram } from './flowchartDiagram';
import { ParsedDiagram } from './model';
import { scanBody } from './scanner';
import { StructureDiagram } from './structureDiagram';
import { parseHeader } from './tags';

export { DiagramSyntaxError } from './errors';

/**
 * Parses the DSL described in the extension spec: a required #type tag and
 * optional #title tag, followed by body content whose syntax (block/edge
 * declarations, bullets) is shared across diagram types but whose meaning is
 * owned by the matching Diagram subclass.
 */
export function parseDSL(source: string): ParsedDiagram {
	const lines = source.split(/\r\n|\n/);
	const header = parseHeader(lines);
	const events = scanBody(lines, header.bodyStartLine);

	const diagram: Diagram =
		header.type === 'flowchart' ? new FlowchartDiagram(header.title) : new StructureDiagram(header.title);

	diagram.consume(events);
	return diagram.toModel();
}
