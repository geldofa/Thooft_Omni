const shifts = [
   { originalId: '1', startTijd: new Date(2026, 3, 6, 22, 0, 0), eindTijd: new Date(2026, 3, 7, 0, 0, 0) },
   { originalId: '2', startTijd: new Date(2026, 3, 6, 6, 0, 0), eindTijd: new Date(2026, 3, 6, 11, 0, 0) }
];

const sorted = [...shifts].sort((a, b) => a.startTijd.getTime() - b.startTijd.getTime());
  
const clusters = [];
let currentCluster = [];
let clusterEnd = 0;

sorted.forEach(shift => {
  if (currentCluster.length === 0) {
    currentCluster.push(shift);
    clusterEnd = shift.eindTijd.getTime();
  } else {
    // THIS LINE:
    if (shift.startTijd.getTime() < clusterEnd) {
      currentCluster.push(shift);
      clusterEnd = Math.max(clusterEnd, shift.eindTijd.getTime());
    } else {
      clusters.push(currentCluster);
      currentCluster = [shift];
      clusterEnd = shift.eindTijd.getTime();
    }
  }
});
if (currentCluster.length > 0) {
  clusters.push(currentCluster);
}

console.log('clusters.length:', clusters.length);
clusters.forEach((c, i) => {
   console.log('Cluster', i, c.map(s => s.originalId));
});

const layouts = [];
clusters.forEach(cluster => {
  const columns = [];
  cluster.forEach((shift) => {
    let placed = false;
    for (const col of columns) {
      const lastShift = col[col.length - 1];
      if (lastShift.eindTijd <= shift.startTijd) {
        col.push(shift);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([shift]);
    }
  });

  const numCols = columns.length;
  columns.forEach((col, colIndex) => {
    col.forEach(shift => {
      layouts.push({
        id: shift.originalId,
        width: `calc(${100 / numCols}% - 2px)`,
        left: `calc(${(colIndex * 100) / numCols}% + 1px)`
      });
    });
  });
});

console.log('layouts output:', layouts);
