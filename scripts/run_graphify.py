import sys
import os
import json
from pathlib import Path

from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

def main():
    root = Path('.').resolve()
    out_dir = root / 'graphify-out'
    out_dir.mkdir(parents=True, exist_ok=True)

    # Save python and root sidecars
    (out_dir / '.graphify_python').write_text(sys.executable, encoding='utf-8')
    (out_dir / '.graphify_root').write_text(str(root), encoding='utf-8')

    print(f"[Graphify] Scanning root: {root}")
    detection = detect(root)
    (out_dir / '.graphify_detect.json').write_text(json.dumps(detection, ensure_ascii=False, indent=2), encoding='utf-8')

    code_files = []
    for f in detection.get('files', {}).get('code', []):
        p = Path(f)
        if p.is_dir():
            code_files.extend(collect_files(p))
        else:
            code_files.append(p)

    print(f"[Graphify] Detected {len(code_files)} code files")

    # AST extraction
    if code_files:
        ast_result = extract(code_files, cache_root=root, root=root)
    else:
        ast_result = {'nodes': [], 'edges': [], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}

    (out_dir / '.graphify_ast.json').write_text(json.dumps(ast_result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"[Graphify] AST extracted: {len(ast_result['nodes'])} nodes, {len(ast_result['edges'])} edges")

    # Semantic nodes for key documentation files
    doc_files = detection.get('files', {}).get('document', [])
    semantic_nodes = []
    semantic_edges = []

    for df in doc_files:
        p = Path(df)
        node_id = f"doc:{p.name}"
        semantic_nodes.append({
            'id': node_id,
            'label': p.name,
            'node_type': 'document',
            'source_file': str(p.relative_to(root)).replace('\\', '/'),
            '_origin': 'semantic'
        })
        # Link document to root concepts
        semantic_edges.append({
            'source': node_id,
            'target': 'src/app/page.tsx',
            'relation': 'documents',
            'confidence': 'EXTRACTED',
            'source_file': str(p.relative_to(root)).replace('\\', '/'),
            '_origin': 'semantic'
        })

    sem_result = {
        'nodes': semantic_nodes,
        'edges': semantic_edges,
        'hyperedges': [],
        'input_tokens': 0,
        'output_tokens': 0
    }
    (out_dir / '.graphify_semantic.json').write_text(json.dumps(sem_result, ensure_ascii=False, indent=2), encoding='utf-8')

    # Merge AST + Semantic
    seen_ids = set()
    merged_nodes = []
    for n in ast_result['nodes']:
        if n['id'] not in seen_ids:
            seen_ids.add(n['id'])
            merged_nodes.append(n)
    for n in sem_result['nodes']:
        if n['id'] not in seen_ids:
            seen_ids.add(n['id'])
            merged_nodes.append(n)

    merged_edges = ast_result['edges'] + sem_result['edges']
    merged = {
        'nodes': merged_nodes,
        'edges': merged_edges,
        'hyperedges': [],
        'input_tokens': 0,
        'output_tokens': 0
    }
    (out_dir / '.graphify_extract.json').write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"[Graphify] Merged total: {len(merged_nodes)} nodes, {len(merged_edges)} edges")

    # Build Graph
    G = build_from_json(merged, root=str(root), directed=False)
    if G.number_of_nodes() == 0:
        print("[Graphify] Error: Graph has 0 nodes")
        sys.exit(1)

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)

    # Assign meaningful labels based on community members
    labels = {}
    for cid, members in communities.items():
        member_str = " ".join(members).lower()
        if "google" in member_str or "sync" in member_str:
            labels[cid] = "Google Workspace & Sheets Sync"
        elif "pdf" in member_str:
            labels[cid] = "PDF Report Generation Engine"
        elif "auth" in member_str or "session" in member_str:
            labels[cid] = "Authentication & User Sessions"
        elif "record" in member_str or "person" in member_str or "counter" in member_str:
            labels[cid] = "Shift & Personnel Record Management"
        elif "filter" in member_str or "suggestion" in member_str or "autocomplete" in member_str:
            labels[cid] = "Search, Autocomplete & Multi-Filtering"
        elif "manifest" in member_str or "pwa" in member_str or "nav" in member_str:
            labels[cid] = "Mobile PWA & App Shell Layout"
        else:
            labels[cid] = f"Architecture Core Cluster {cid}"

    questions = suggest_questions(G, communities, labels)

    # Save graph.json with community labels
    to_json(G, communities, str(out_dir / 'graph.json'), community_labels=labels)

    # Save GRAPH_REPORT.md
    report = generate(
        G, communities, cohesion, labels, gods, surprises,
        detection, {'input': 0, 'output': 0}, str(root),
        suggested_questions=questions
    )
    (out_dir / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    (out_dir / '.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False, indent=2), encoding='utf-8')

    # Generate interactive HTML visualization
    try:
        to_html(G, communities, str(out_dir / 'graph.html'), community_labels=labels)
        print(f"[Graphify] graph.html generated successfully at {out_dir / 'graph.html'}")
    except Exception as e:
        print(f"[Graphify] Notice on HTML export: {e}")

    print(f"[Graphify] Complete: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities.")

if __name__ == '__main__':
    main()
