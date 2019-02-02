const express = require('express');
const jsnx = require('jsnetworkx');

const router = express.Router();

// eslint-disable-next-line no-unused-vars
router.post('/', (req, res, next) => {
  const {cast, segments} = req.body;
  if (!cast || !segments) {
    return res.status(400).json({message: 'missing cast or segments'});
  }
  const graph = makeGraph(cast, segments);
  const metrics = calcMetrics(graph);
  res.json(metrics);
});

module.exports = router;

function calcMetrics (graph) {
  const G = new jsnx.Graph();
  G.addNodesFrom(graph.nodes.map(n => n.id));
  G.addEdgesFrom(graph.edges.map(e => [e.source, e.target]));
  const paths = jsnx.shortestPathLength(G);
  const density = jsnx.density(G);
  const size = graph.nodes.length;

  let diameter = 0;
  let sum = 0;
  let numPairs = 0;
  for (const x of paths.entries()) {
    for (const y of x[1].entries()) {
      const l = y[1];
      sum += l;
      if (x[0] !== y[0]) {
        numPairs++;
      }
      if (l > diameter) {
        diameter = l;
      }
    }
  }

  const nodes = {};
  G.nodes().forEach(id => {
    nodes[id] = {};
  });

  let sumDegrees = 0;
  let maxDegree = 0;
  let maxDegreeIds = [];
  const degrees = jsnx.degree(G);
  for (const d of degrees) {
    const id = d[0];
    const degree = d[1];
    nodes[id].degree = degree;
    sumDegrees += degree;
    if (degree === maxDegree) {
      maxDegreeIds.push(id);
    } else if (degree > maxDegree) {
      maxDegree = degree;
      maxDegreeIds = [];
      maxDegreeIds.push(id);
    }
  }

  // closeness centrality
  for (const n of jsnx.allPairsShortestPath(G)) {
    const id = n[0];
    const paths = [];
    for (const p of n[1]) {
      paths.push(p[1]);
    }
    const summedLengths = paths.reduce((sum, p) => sum + p.length - 1, 0);
    nodes[id].closeness = 1 / summedLengths;
  }

  // betweenness centrality
  for (const n of jsnx.betweennessCentrality(G, {normalized: true})) {
    const id = n[0];
    nodes[id].betweenness = n[1];
  }

  // eigenvector centrality
  for (const n of jsnx.eigenvectorCentrality(G)) {
    const id = n[0];
    nodes[id].eigenvector = n[1];
  }

  return {
    size,
    density,
    diameter,
    maxDegree,
    maxDegreeIds,
    averageDegree: sumDegrees / size,
    averagePathLength: sum / numPairs,
    averageClustering: jsnx.averageClustering(G),
    nodes
  };
}

function makeGraph (cast, segments) {
  const nodes = [];
  cast.forEach(p => {
    nodes.push({id: p.id, label: p.name || `#${p.id}`});
  });
  const cooccurrences = getCooccurrences(segments);
  const edges = [];
  cooccurrences.forEach(cooc => {
    edges.push({
      id: cooc[0] + '|' + cooc[1],
      source: cooc[0],
      target: cooc[1],
      size: cooc[2]
    });
  });
  return {nodes, edges};
}

function getCooccurrences (segments) {
  const map = {};
  segments.forEach(s => {
    if (!s.speakers) {
      return;
    }
    // make sure each speaker occurs only once in scene
    const speakers = s.speakers.filter((v, i, a) => a.indexOf(v) === i);
    speakers.forEach((c, i) => {
      if (i < speakers.length - 1) {
        const others = speakers.slice(i + 1);
        others.forEach(o => {
          const pair = [c, o].sort();
          const key = pair.join('|');
          if (map[key]) {
            map[key][2]++;
          } else {
            map[key] = pair.concat(1);
          }
        });
      }
    });
  });

  const cooccurrences = [];
  Object.keys(map)
    .sort()
    .forEach(key => {
      cooccurrences.push(map[key]);
    });

  return cooccurrences;
}
