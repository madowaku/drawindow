/**
 * Pin dynamic batch shapes [-1, H, W, C] to batch-1 for LiteRT.js compiled-model
 * tensor compatibility. DOES NOT alter learned weights or operations.
 * Safe, fail-closed flatbuffer structure traversal. Never modifies source.
 * Existing model is separately SHA-verified before this transformation.
 */
function tableField(buf, table, index) {
  if(table<4||table+4>buf.length)throw Error('Invalid flatbuffer table');
  const vt=table-buf.readInt32LE(table);
  if(vt<0||vt+4>buf.length)throw Error('Invalid flatbuffer vtable');
  const len=buf.readUInt16LE(vt);
  const e=vt+4+index*2;
  if(e+2>vt+len)return null;
  const delta=buf.readUInt16LE(e);
  return delta?table+delta:null;
}
function derefVector(buf,field) {
  if(field===null)throw Error('Missing flatbuffer field');
  const off=field+buf.readUInt32LE(field);
  if(off+4>buf.length)throw Error('Bad vector');
  const length=buf.readUInt32LE(off);
  return {data:off+4,length};
}
function tableAt(buf,vector,index){
  if(index<0||index>=vector.length)throw Error('Tensor index not found');
  const p=vector.data+4*index;
  if(p+4>buf.length)throw Error('Bad table offset');
  const value=p+buf.readUInt32LE(p);
  if(value>=buf.length)throw Error('Bad table target');
  return value;
}
function patchInputOrOutput(buf,tensors,idx,rank){
  const t=tableAt(buf,tensors,idx);
  const field=tableField(buf,t,7); // Tensor.shape_signature, TFLite schema
  const v=derefVector(buf,field);
  if(v.length!==rank)throw Error('Unexpected tensor rank: '+v.length);
  const dims=Array.from({length:rank},(_,i)=>buf.readInt32LE(v.data+i*4));
  if(dims[0]!==-1)throw Error('Expected dynamic batch: '+dims);
  if(dims.slice(1).some(v=>v<1))throw Error('Unexpected dynamic spatial dimension');
  buf.writeInt32LE(1,v.data);
  return dims;
}
export function staticBatchOne(raw){
  const buf=Buffer.from(raw);
  const root=buf.readUInt32LE(0); // Root Model table
  const graphs=derefVector(buf,tableField(buf,root,2));
  if(graphs.length!==1)throw Error('Unexpected TFLite subgraph count');
  const graph=tableAt(buf,graphs,0);
  const tensors=derefVector(buf,tableField(buf,graph,0));
  const inputs=derefVector(buf,tableField(buf,graph,1));
  const outputs=derefVector(buf,tableField(buf,graph,2));
  if(inputs.length!==1||outputs.length!==1)throw Error('Expected one image input / one classifier output');
  const inputIndex=buf.readInt32LE(inputs.data);
  const outputIndex=buf.readInt32LE(outputs.data);
  const input=patchInputOrOutput(buf,tensors,inputIndex,4);
  const output=patchInputOrOutput(buf,tensors,outputIndex,2);
  if(input.join(',')!=='-1,28,28,1'||output.join(',')!=='-1,345')throw Error('Model tensor signatures differ from expected release');
  return { bytes:buf, originalInput:input, originalOutput:output };
}
