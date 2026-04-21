const KEY='acv_v1';
export function getContracts(){return JSON.parse(localStorage.getItem(KEY)||'[]')}
export function saveContract(c){const arr=getContracts();arr.unshift(c);localStorage.setItem(KEY,JSON.stringify(arr));return c}
