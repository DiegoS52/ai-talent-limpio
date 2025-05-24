import mongoose from 'mongoose';

const TokenUsageSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  usuario: String,
  consulta: String,
  modelo: String,
  tokens_prompt: Number,
  tokens_respuesta: Number,
  tokens_total: Number,
  costo_input: Number,
  costo_output: Number,
  costo_total: Number
});

const TokenUsage = mongoose.model('TokenUsage', TokenUsageSchema);
export default TokenUsage;