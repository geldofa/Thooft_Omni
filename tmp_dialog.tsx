              {/* Drukwerken Aggregated Summary Card */}
              {selectedLog.entity === 'FinishedJob' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-4">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-orange-600" />
                      Afgewerkte Versies
                    </h3>
                    {selectedVersionIds.size > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7 text-gray-500 hover:text-gray-900"
                        onClick={() => setSelectedVersionIds(new Set())}
                      >
                        Wis selectie ({selectedVersionIds.size})
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const latestStr = selectedLog.newValue || selectedLog.oldValue || '';
                    const mainChanges = parseChanges(latestStr, latestStr);
                    const getMainField = (name: string) => mainChanges.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-';
                    const orderNr = getMainField('Order') !== '-' ? getMainField('Order') : (selectedLog.entityName.split(' - ')[0] || '-');
                    
                    // Group logs by entityId to find unique versions
                    const versionLogs = activityLogs.filter(l => l.entity === 'FinishedJob' && l.entityName.startsWith(orderNr));
                    const uniqueJobIds = Array.from(new Set(versionLogs.map(l => l.entityId)));
                    
                    const aggregatedVersions = uniqueJobIds.map(jobId => {
                      const logsForJob = versionLogs.filter(l => l.entityId === jobId);
                      // Sort ascending so we can grab the first (created) and last (current state)
                      logsForJob.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                      
                      const firstLog = logsForJob[0];
                      const lastLog = logsForJob[logsForJob.length - 1];
                      
                      const lastChanges = parseChanges(lastLog.newValue || lastLog.oldValue || '', lastLog.newValue || lastLog.oldValue || '');
                      const getField = (name: string) => lastChanges.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-';
                      
                      return {
                        id: jobId,
                        createdDate: firstLog.timestamp,
                        naam: getField('Naam') !== '-' ? getField('Naam') : (lastLog.entityName.split(' - ')[1] || '-'),
                        versie: getField('Versie'),
                        netto: getField('Netto'),
                        groen: getField('Groen'),
                        rood: getField('Rood'),
                        delta: getField('Delta %'),
                      };
                    }).sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());

                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white hover:bg-white border-none">
                              <TableHead className="w-[120px] text-xs font-semibold text-gray-500 uppercase">Aanmaakdatum</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Naam / Versie</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Netto</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Gecontroleerd</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Delta %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {aggregatedVersions.map(v => {
                              const isSelected = selectedVersionIds.has(v.id);
                              return (
                                <TableRow 
                                  key={v.id} 
                                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80 border-l-2 border-l-blue-500' : 'hover:bg-gray-50/50 border-l-2 border-l-transparent'}`}
                                  onClick={() => {
                                    const next = new Set(selectedVersionIds);
                                    if (next.has(v.id)) next.delete(v.id);
                                    else next.add(v.id);
                                    setSelectedVersionIds(next);
                                  }}
                                >
                                  <TableCell className="text-xs text-gray-500">
                                    {formatDateTime(v.createdDate)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900 truncate max-w-[200px]" title={v.naam}>{v.naam}</span>
                                      {v.versie !== '-' && <span className="text-xs text-gray-500">Versie: {v.versie}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium text-blue-600">
                                    {v.netto}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-green-600 font-medium">{v.groen}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-red-600 font-medium">{v.rood}</span>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {v.delta}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {(selectedLog.oldValue || selectedLog.newValue) && selectedLog.action === 'Updated' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-500" />
                    Wijzigingenoverzicht
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                    {parseChanges(selectedLog.oldValue || '', selectedLog.newValue || '')
                      .filter(change => change.old !== change.new) // Only show actual changes
                      .filter(change => !change.field.toLowerCase().includes('volgend onderhoud') && !change.field.toLowerCase().includes('volgende datum'))
                      .map((change, idx) => {
                        const oldVal = change.old.length > 100 ? change.old.substring(0, 97) + '...' : change.old;
                        const newVal = change.new.length > 100 ? change.new.substring(0, 97) + '...' : change.new;

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <span className="font-bold text-gray-900 shrink-0">{change.field}:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {change.old !== '-' && (
                                <>
                                  <span className="text-gray-400 italic line-through font-normal">{oldVal}</span>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <span className="text-blue-700 font-medium">{newVal}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* History Section */}
              {selectedLog.entityId && selectedLog.entityId !== 'new' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Activiteitshistorie (Vorige wijzigingen)
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        {selectedLog.entity === 'FinishedJob' ? (
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="w-[120px] font-semibold text-gray-900">Datum</TableHead>
                            <TableHead className="w-[100px] font-semibold text-gray-900">Actie</TableHead>
                            <TableHead className="font-semibold text-gray-900">Order</TableHead>
                            <TableHead className="font-semibold text-gray-900">Naam</TableHead>
                            <TableHead className="font-semibold text-gray-900">Blz</TableHead>
                            <TableHead className="font-semibold text-gray-900">Netto</TableHead>
                            <TableHead className="font-semibold text-gray-900">Groen</TableHead>
                            <TableHead className="font-semibold text-gray-900">Rood</TableHead>
                            <TableHead className="font-semibold text-gray-900">Delta %</TableHead>
                            <TableHead className="font-semibold text-gray-900">Opmerkingen</TableHead>
                          </TableRow>
                        ) : (
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="w-[120px] font-semibold text-gray-900">Datum</TableHead>
                            <TableHead className="font-semibold text-gray-900">Taak</TableHead>
                            <TableHead className="font-semibold text-gray-900">Laatste onderhoud</TableHead>
                            <TableHead className="font-semibold text-gray-900">Volgende onderhoud</TableHead>
                            <TableHead className="font-semibold text-gray-900">Operators</TableHead>
                            <TableHead className="font-semibold text-gray-900">Opmerkingen</TableHead>
                          </TableRow>
                        )}
                      </TableHeader>
                      <TableBody>
                        {activityLogs
                          .filter(l => {
                            // Only show for this specific entity (or order family if FinishedJob)
                            if (selectedLog.entity === 'FinishedJob') {
                              // If it's a Drukwerk, show logs matching the order prefix
                              const orderNr = selectedLog.entityName.split(' - ')[0];
                              const isSameOrder = l.entity === 'FinishedJob' && l.entityName.startsWith(orderNr);
                              if (!isSameOrder) return false;
                              // If versions are selected, only show logs for those specific entityIds
                              if (selectedVersionIds.size > 0 && !selectedVersionIds.has(l.entityId)) return false;
                              return true;
                            }
                            return l.entity === selectedLog.entity && l.entityId === selectedLog.entityId;
                          })
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((histLog) => {
                            const isCurrent = histLog.id === selectedLog.id;
                            const rowClass = isCurrent ? "bg-blue-50/30" : "";
                            
                            if (histLog.entity === 'FinishedJob') {
                              // Drukwerken History Row
                              const changes = parseChanges(histLog.oldValue || '', histLog.newValue || '');
                              const diffs = changes.filter(c => c.old !== c.new);
                              
                              const getFieldDiff = (name: string) => {
                                const diff = diffs.find(c => c.field.toLowerCase() === name.toLowerCase());
                                if (!diff) {
                                  // If no change, just show the new value (or '-' if it doesn't exist)
                                  return <span className="text-gray-600">{changes.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-'}</span>;
                                }
                                return (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="line-through text-gray-400">{diff.old}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-blue-600 font-medium">{diff.new}</span>
                                  </div>
                                );
                              };
                              
                              const rawVersieObj = changes.find(c => c.field.toLowerCase() === 'versie');
                              const rawVersie = rawVersieObj?.new || '-';

                              return (
                                <TableRow key={histLog.id} className={rowClass}>
                                  <TableCell className="text-xs text-gray-500 whitespace-nowrap align-top">
                                    {formatDateTime(histLog.timestamp)}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {getActionBadge(histLog.action)}
                                  </TableCell>
                                  <TableCell className="text-xs align-top font-medium">
                                    {(changes.find(c => c.field.toLowerCase() === 'order')?.new || '-') === '-' 
                                      ? histLog.entityName.split(' - ')[0] 
                                      : getFieldDiff('Order')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900">{histLog.entityName.split(' - ')[1] || histLog.entityName}</span>
                                      {rawVersie !== '-' && (
                                        <span className="text-gray-500 mt-0.5">Versie: {getFieldDiff('Versie')}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Blz')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Netto')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Groen')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Rood')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Delta %')}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic max-w-xs truncate align-top">
                                    {histLog.action === 'Updated' && diffs.length > 0 ? (
                                      diffs.filter(d => !['Order', 'Naam', 'Versie', 'Blz', 'Netto', 'Groen', 'Rood', 'Delta %'].includes(d.field)).map(d => `${d.field}: ${d.new}`).join(', ')
                                    ) : (
                                      histLog.details
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            } else {
                              // Task / Default History Row
                              const histChanges = parseChanges(histLog.oldValue || '', histLog.newValue || '');
                              const lastMaintenance = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('laatste onderhoud') || f.includes('datum') || f === 'last_date';
                              })?.new || '-';
                              const nextMaintenance = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('volgend onderhoud') || f.includes('volgende datum') || f === 'next_date';
                              })?.new || '-';
                              const operators = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('operator') || f.includes('toegewezen') || f.includes('assigned_operator');
                              })?.new || '-';
                              const opmerkingen = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('opmerking');
                              })?.new || '-';
  
                              return (
                                <TableRow key={histLog.id} className={rowClass}>
                                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateTime(histLog.timestamp)}
                                  </TableCell>
                                  <TableCell className="text-xs font-medium text-gray-700">
                                    {histLog.entityName}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {lastMaintenance}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {nextMaintenance}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {operators}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic max-w-xs truncate">
                                    {opmerkingen}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}


            </div>
          )}

          <div className="flex justify-end mt-1">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Sluiten</Button>
          </div>
        </DialogContent>
      </Dialog>
