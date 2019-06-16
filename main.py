"""DraCor metrics service"""
import hug
import networkx as nx


@hug.post('/metrics')
def metrics(segments):
    """Calculates network metrics for play"""

    G = nx.Graph()

    for seg in segments:
        speakers = seg.get('speakers', [])
        length = len(speakers)
        for i in range(length):
            if i < length - 1:
                source = speakers[i]
                others = speakers[i+1:length]
                for target in others:
                    G.add_edge(source, target)

    size = len(list(G.nodes))
    max_degree = max([d for n, d in G.degree()])
    max_degree_ids = [n for n, d in G.degree() if d == max_degree]

    nodes = {}
    cc = nx.closeness_centrality(G)
    bc = nx.betweenness_centrality(G)
    # FIXME: nx.eigenvector_centrality throws an exception with
    # https://dracor.org/api/corpora/rus/play/lermontov-strannyj-chelovek
    # we catch this here so we can still yield the rest of the metrics.
    try:
        ec = nx.eigenvector_centrality(G)
    except nx.exception.PowerIterationFailedConvergence:
        ec = {}

    for n, d in G.degree():
        nodes[n] = {
            'degree': d,
            'betweenness': bc[n],
            'closeness': cc[n]
        }
        if n in ec:
            nodes[n]['eigenvector'] = ec[n]

    return {
        'size': size,
        'density': nx.density(G),
        'averageDegree': sum([d for n, d in G.degree()]) / size,
        'averageClustering': nx.average_clustering(G),
        'maxDegree': max_degree,
        'maxDegreeIds': max_degree_ids,
        'numConnectedComponents': nx.number_connected_components(G),
        'nodes': nodes
    }


if __name__ == '__main__':
    metrics.interface.cli()
