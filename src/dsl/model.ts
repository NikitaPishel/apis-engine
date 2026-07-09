export type DiagramType = 'structure' | 'flowchart';

export interface Message {
	text: string;
	comments: string[];
}

export interface Block {
	/** Unique key: the block's id for structure blocks, or "id#index" for flowchart steps. */
	key: string;
	id: string;
	index: number | null;
	messages: Message[];
}

export interface Edge {
	from: string;
	to: string;
	label?: string;
}

export interface ParsedDiagram {
	type: DiagramType;
	title: string;
	blocks: Block[];
	edges: Edge[];
}

export interface PositionedBlock extends Block {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PositionedEdge extends Edge {
	points: { x: number; y: number }[];
}

export interface PositionedDiagram {
	type: DiagramType;
	title: string;
	blocks: PositionedBlock[];
	edges: PositionedEdge[];
	width: number;
	height: number;
}

export function blockKey(id: string, index: number | null): string {
	return index === null ? id : `${id}#${index}`;
}
