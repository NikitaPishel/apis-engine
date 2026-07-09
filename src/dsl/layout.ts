import * as dagre from 'dagre';
import { Block, ParsedDiagram, PositionedBlock, PositionedDiagram, PositionedEdge } from './model';

const LINE_HEIGHT = 18;
const HEADER_HEIGHT = 34;
const VERTICAL_PADDING = 18;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const CHAR_WIDTH = 7;
const HORIZONTAL_PADDING = 44;

function estimateSize(block: Block): { width: number; height: number } {
	const title = block.messages[0]?.text ?? block.id;
	const bodyMessages = block.messages.slice(1);

	let lineCount = 0;
	const lineLengths: number[] = [title.length];

	for (const message of bodyMessages) {
		lineCount += 1;
		lineLengths.push(message.text.length);
		for (const comment of message.comments) {
			lineCount += 1;
			lineLengths.push(comment.length + 2);
		}
	}

	const maxLen = Math.max(...lineLengths, 10);
	const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxLen * CHAR_WIDTH + HORIZONTAL_PADDING));

	if (bodyMessages.length === 0) {
		return { width, height: HEADER_HEIGHT };
	}

	const height = HEADER_HEIGHT + VERTICAL_PADDING + lineCount * LINE_HEIGHT;
	return { width, height };
}

export function layoutDiagram(diagram: ParsedDiagram): PositionedDiagram {
	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 90, marginx: 40, marginy: 40 });
	g.setDefaultEdgeLabel(() => ({}));

	const knownKeys = new Set(diagram.blocks.map((b) => b.key));
	const sizes = new Map<string, { width: number; height: number }>();

	for (const block of diagram.blocks) {
		const size = estimateSize(block);
		sizes.set(block.key, size);
		g.setNode(block.key, size);
	}

	const validEdges = diagram.edges.filter((e) => knownKeys.has(e.from) && knownKeys.has(e.to));
	for (const edge of validEdges) {
		g.setEdge(edge.from, edge.to);
	}

	dagre.layout(g);

	const positionedBlocks: PositionedBlock[] = diagram.blocks.map((block) => {
		const gNode = g.node(block.key);
		const size = sizes.get(block.key)!;
		return {
			...block,
			x: gNode ? gNode.x - size.width / 2 : 0,
			y: gNode ? gNode.y - size.height / 2 : 0,
			width: size.width,
			height: size.height,
		};
	});

	const positionedEdges: PositionedEdge[] = validEdges.map((edge) => {
		const gEdge = g.edge(edge.from, edge.to);
		const points = gEdge?.points?.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })) ?? [];
		return { ...edge, points };
	});

	let maxX = 0;
	let maxY = 0;
	for (const b of positionedBlocks) {
		maxX = Math.max(maxX, b.x + b.width);
		maxY = Math.max(maxY, b.y + b.height);
	}

	return {
		type: diagram.type,
		title: diagram.title,
		blocks: positionedBlocks,
		edges: positionedEdges,
		width: maxX + 60,
		height: maxY + 60,
	};
}
