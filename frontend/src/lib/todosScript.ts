export const todosStorageKey = "todos";

export const reservedRowsProperty = "--reserved-rows";

export const todosScript = `(function(){try{var raw=localStorage.getItem("${todosStorageKey}");var rows=raw?JSON.parse(raw).length:0;if(rows>1)document.documentElement.style.setProperty("${reservedRowsProperty}",String(rows))}catch{}})()`;
