import { cnpjValido, somenteDigitos } from '../cnpj';

export type CadastroPromotora = {
  empresa: 'AKRK' | 'DIG'; nome: string; cnpj: string | null; codigo: string | null;
  origem: 'manual' | 'front_v2' | 'funcao'; ativo: boolean; gerenteComercialId: string | null;
};
export class ErroPromotora extends Error {}

export function lerPromotora(form: FormData): CadastroPromotora {
  const texto = (campo: string) => String(form.get(campo) ?? '').trim();
  const empresa = texto('empresa');
  const nome = texto('nome');
  const cnpj = texto('cnpj');
  const codigo = texto('codigo');
  const origem = texto('origem');
  const ativo = texto('ativo');
  if (empresa !== 'AKRK' && empresa !== 'DIG') throw new ErroPromotora('Selecione uma empresa válida.');
  if (!nome || nome.length > 160) throw new ErroPromotora('Informe um nome com até 160 caracteres.');
  if (cnpj && (!/^[\d.\/-]+$/.test(cnpj) || !cnpjValido(cnpj))) throw new ErroPromotora('Informe um CNPJ válido.');
  if (codigo.length > 100) throw new ErroPromotora('O código deve ter até 100 caracteres.');
  if (origem !== 'manual' && origem !== 'front_v2' && origem !== 'funcao') throw new ErroPromotora('Selecione uma origem válida.');
  if (ativo !== 'true' && ativo !== 'false') throw new ErroPromotora('Informe uma situação válida.');
  return { empresa, nome, cnpj: cnpj ? somenteDigitos(cnpj) : null, codigo: codigo || null, origem, ativo: ativo === 'true', gerenteComercialId: texto('gerenteId') || null };
}

export function resumirAlteracoes(anterior: CadastroPromotora | null, posterior: CadastroPromotora): string {
  if (!anterior) return 'Promotora cadastrada';
  const rotulos: Record<keyof CadastroPromotora, string> = { empresa: 'empresa', nome: 'nome', cnpj: 'CNPJ', codigo: 'código', origem: 'origem', ativo: 'situação', gerenteComercialId: 'gerente' };
  const campos = (Object.keys(rotulos) as (keyof CadastroPromotora)[]).filter(campo => anterior[campo] !== posterior[campo]);
  return campos.length ? `Alterações: ${campos.map(campo => rotulos[campo]).join(', ')}` : '';
}
