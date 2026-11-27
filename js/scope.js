/* Zeit — escopo atual: setor + subpasta (área de trabalho) escolhida antes de abrir o sistema */
(function () {
  const Z = {
    sector: null,
    ws: null, // pasta raiz escolhida (área de trabalho)
    set(sector, ws) { Z.sector = sector; Z.ws = ws; },
    clear() { Z.sector = null; Z.ws = null; },
    /** prefixo das rotas do sistema: #/s/<setor>/w/<subpasta> */
    base() { return Z.ws ? `#/s/${Z.sector.id}/w/${Z.ws.id}` : (Z.sector ? `#/s/${Z.sector.id}` : '#/'); },
    url(path) { return `${Z.base()}/${path}`; },
    /** o cronograma pertence à subpasta atual (ou a uma pasta dentro dela)? */
    inScope(s) {
      if (!Z.ws) return true;
      if (s.sectorId !== Z.ws.sectorId) return false;
      return Store.folderPath(s.folderId).some((f) => f.id === Z.ws.id);
    },
    rootId() { return Z.ws ? Z.ws.id : null; },
  };
  window.Z = Z;
})();
