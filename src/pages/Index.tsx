import React from 'react';
import { useParams, useSearchParams } from "react-router-dom";
import ReportHeader from "@/components/ReportHeader";
import ReportFooter from "@/components/ReportFooter";
import { useRelatorio, RelatorioResponse } from "@/hooks/useRelatorio";
import { SensitivaItem, UltrasomItem } from "@/types/vibracao";

const Index = () => {
  const { idRelatorio: paramId } = useParams<{
    idRelatorio?: string;
  }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("idRelatorio");

  // Suporta tanto /relatorio/:id quanto /?idRelatorio=id
  const idRelatorio = paramId || queryId;
  const {
    data,
    isLoading,
    error
  } = useRelatorio(idRelatorio);

  // Normalizar dados para suportar tanto vibracao quanto ultrassom
  const normalizeRelatorio = (response: RelatorioResponse) => {
    const responseData = response as any;
    const baseRelatorio = response.relatorio as any;

    const relatorio = {
      ...baseRelatorio,
      cliente: baseRelatorio.cliente ?? responseData.cliente,
      executor: baseRelatorio.executor ?? baseRelatorio.usuario ?? responseData.usuario,
      aprovador: baseRelatorio.aprovador ?? responseData.aprovador,
      dataExe: baseRelatorio.dataExe ?? baseRelatorio.data_execucao ?? baseRelatorio.dataExecucao,
      num_revisao: baseRelatorio.num_revisao ?? baseRelatorio.revisao,
      n_relatorio: baseRelatorio.n_relatorio ?? baseRelatorio.numero,
    } as any;

    // Se tem array ultrassom, normaliza para vibracoes
    if (Array.isArray(baseRelatorio.ultrassom) && !Array.isArray(baseRelatorio.vibracoes)) {
      relatorio.vibracoes = baseRelatorio.ultrassom.map((item: UltrasomItem) => ({
        id: item.id || 0,
        foto: item.foto_painel || item.foto1 || item.foto,
        foto2: item.foto_camera || item.foto2,
        setor: item.setor,
        num_vazamento: item.num_vazamento,
        localizacao: item.localizacao,
        componente: item.componente,
        valor_medido: item.valor_medido,
        local: item.local || item.localizacao || "",
        area: item.area || item.setor,
        conjunto: item.conjunto || "",
        espectro: null,
        diagnostico: item.diagnostico,
        equipamento: null,
        recomendacao: item.recomendacao,
        status: item.status,
        st3: item.status,
        data_exe: relatorio.dataExe
      }));
    }

    // Se tem array sensitivas, também normaliza para vibracoes
    if (Array.isArray(responseData.sensitivas) && !Array.isArray(relatorio.vibracoes)) {
      relatorio.vibracoes = responseData.sensitivas.map((item: SensitivaItem) => {
        const fotos = Array.isArray(item.fotos) ? item.fotos : [];
        const checklist = Array.isArray(item.checklist) ? item.checklist : [];
        const checklistNok = checklist.filter((entry) => entry.situacao?.toUpperCase() === "NOK");

        return {
          id: item.id || 0,
          foto: fotos[0]?.url || null,
          foto2: fotos[1]?.url || null,
          fotos,
          checklist,
          setor: item.area || "-",
          area: item.area || "-",
          localizacao: item.equipamento || "-",
          local: item.equipamento || "-",
          componente: item.tag || "-",
          num_vazamento: item.tag || "-",
          status: checklistNok.length > 0 ? "NOK" : "OK",
          st3: checklistNok.length > 0 ? "NOK" : "OK",
          data_exe: relatorio.dataExe,
        };
      });
    }

    return relatorio;
  };

  const handlePrint = () => {
    window.print();
  };
  if (!idRelatorio) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-primary mb-4">Relatório de Ultrassom</h1>
          <p className="text-muted-foreground mb-6">
            Informe o ID do relatório na URL para visualizar os dados.
          </p>
          <div className="bg-secondary/30 rounded-lg p-4 text-sm font-mono">
            <p>/relatorio/38</p>
            <p className="text-muted-foreground mt-2">ou</p>
            <p>/?idRelatorio=38</p>
          </div>
        </div>
      </div>;
  }
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-destructive text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-destructive mb-2">Erro ao carregar relatório</h1>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum dado encontrado.</p>
      </div>;
  }

  // Normalizar dados para suportar tanto vibracao quanto ultrassom
  const relatorio = normalizeRelatorio(data);

  // Usar cliente do response ou do relatorio
  const clienteData = relatorio.cliente;
  // Usar executor do response ou do relatorio
  const executorData = relatorio.executor;
  // Usar aprovador do response ou do relatorio
  const aprovadorData = relatorio.aprovador;

  const getReportDateString = () => {
    if (relatorio.data_execucao) {
      return relatorio.data_execucao;
    }
    return relatorio.dataExe;
  };

  const parseDate = (dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(dateStr);
  };

  const formatDataExe = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  // Formatar data como mês/ano
  const formatMonthYear = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/de /g, "");
  };
  return <div className="min-h-screen bg-background py-8 px-4 print:p-0 print:bg-white">
      {/* Print Button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button onClick={handlePrint} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir A4
        </button>
      </div>

      <div className="a4-container">
        
        {/* Cover Page */}
        <div className="report-page print-break flex flex-col text-center">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <img src="/logo-jundpred.jpg" alt="JundPred - Manutenção Preditiva" className="cover-logo h-8 w-auto" />
              <img src="/logo_brasil.jpg" alt="Logo Brasil" className="cover-logo h-8 w-auto" />
            </div>

            <div className="bg-primary text-primary-foreground py-4 px-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold">RELATÓRIO DE MANUTENÇÃO PREDITIVA</h2>
              <p className="text-lg mt-2">REF. MANUTENÇÃO SENSITIVA</p>
              <p className="text-sm mt-2 opacity-80">Nº {`${relatorio.id} ${relatorio.num_revisao ?? ""}`.trim()}</p>
            </div>

            <div className="mb-8 flex justify-center items-center">
              <img src="/logo-sensitiva.jpg" alt="Imagem de Manutenção Sensitiva" className="cover-image rounded-lg" style={{ width: "160px", height: "160px", objectFit: "cover" }} />
            </div>

            {clienteData?.logo && <div className="mb-8">
              <img src={clienteData.logo} alt={clienteData.nome} className="cover-logo h-20 w-auto mx-auto" />
            </div>}

            {clienteData && <div className="bg-secondary/30 rounded-lg p-4 mb-6 text-center">
                <h3 className="font-semibold text-primary mb-2">Cliente / Unidade</h3>
                <p className="font-bold text-lg">{clienteData.nome} - {clienteData.cidade}/{clienteData.estado}</p>
                
              </div>}

            <div className="grid grid-cols-1 gap-8 text-center max-w-lg mx-auto">
              <div>
                <p className="text-muted-foreground text-sm">Data da Inspeção</p>
                <p className="font-semibold">{formatMonthYear(relatorio.dataExe)}</p>
              </div>
              
            </div>
          </div>

          <ReportFooter />
        </div>

        {/* Letter Page */}
        <div className="report-page print-break flex flex-col">
          <div className="flex-1">
          <ReportHeader />
          
          <div className="text-right text-sm text-muted-foreground mb-8">
            Jundiaí, {formatDataExe(relatorio.dataExe)}.
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground">A/C:</p>
            <p className="font-semibold">{clienteData?.pessoa_contato || "Departamento de Manutenção"}</p>
            {clienteData?.departamento_contato && <p className="text-sm text-muted-foreground">{clienteData.departamento_contato}</p>}
            {clienteData && <div className="mt-2 text-sm">
                <p className="font-medium">{clienteData.nome}</p>
                <p className="text-muted-foreground">{clienteData.email}</p>
                <p className="text-muted-foreground">{clienteData.telefone}</p>
              </div>}
          </div>

          <div className="mb-8">
            
            <p className="text-foreground leading-relaxed">Referente à inspeção de análise por ultrassom nos equipamentos na data de <strong>{getReportDateString()}</strong>.
              <br />
              Relatório Nº <strong>{`${relatorio.id} ${relatorio.num_revisao ?? ""}`.trim()}</strong>.
              <br />
              < br/>
              
                <p>A inspeção sensitiva de multiparametro tem por finalidade avaliar a condição geral 
              dos equipamentos monitorados, avaliando:</p>
              <br></br>
              <p>1) Vazamento de óleo no sistema hidráulico</p>
              <p>2) Vazamento de óleo de corte (Coolant)</p>
              <p>3) Ruído anormal no equipamento</p>
              <p>4) Fixação dos motores</p>
              <p>5) Transmissão (Acoplamento e Correias)</p>
              <p>6) Vazamento de ar comprimido</p>
              <p>7) Chave de segurança do equipamento</p>
              <p>8) Cortina de Segurança</p>
              <p>9) Coluna luminosa “Sinaleiro”</p>
              <p>10) Painéis operacionais (botões e lâmpadas)</p>
            </p>
          </div>

          <div className="mb-8">
            <p className="mb-4">Atenciosamente,</p>
            <div className="border-l-4 border-primary pl-4">
              <p className="font-semibold">Luís Henrique Guimarães Stefani</p>
              <p className="text-muted-foreground text-sm">DIETOR COMERCIAL</p>
              <p className="text-sm mt-2">luis@jundpred.com.br</p>
              <p className="text-sm mt-2">Tel.: (11) 2817-0616</p>
              <p className="text-sm mt-2">Cel.: (11) 97471-9744</p>
            </div>
          </div>
          </div>
          <ReportFooter />
        </div>

        {/* Second Page */}
        {relatorio.resumo_ar_comprimido && (
        <div className="report-page print-break flex flex-col">
          <div className="flex-1">
            <ReportHeader />
            
            <h2 className="report-title">PONTOS DE VAZAMENTO DE AR COMPRIMIDO</h2>
            
            <div className="mb-6">
              <p className="mb-4">
                <span className="text-primary font-semibold">➤ Total de pontos de vazamento de Ar Comprimido = {relatorio.resumo_ar_comprimido.tabela.reduce((sum, item) => sum + item.qtd, 0)} pontos;</span>
              </p>
            </div>

            {/* First Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-gray-300 p-2 text-left">Total KWh</th>
                    <th className="border border-gray-300 p-2 text-left">Valor KWh (R$)</th>
                    <th className="border border-gray-300 p-2 text-left">Total Horas Mês</th>
                    <th className="border border-gray-300 p-2 text-left">Total Mês</th>
                    <th className="border border-gray-300 p-2 text-left">Total Ano</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-secondary/50">
                    <td className="border border-gray-300 p-2">{relatorio.resumo_ar_comprimido.total_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td className="border border-gray-300 p-2 font-bold">R$ {relatorio.resumo_ar_comprimido.valor_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 p-2">{relatorio.resumo_ar_comprimido.horas_mes}</td>
                    <td className="border border-gray-300 p-2">R$ {relatorio.resumo_ar_comprimido.custo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 p-2">R$ {relatorio.resumo_ar_comprimido.custo_ano.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Second Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-gray-300 p-2 text-left">mm do furo</th>
                    <th className="border border-gray-300 p-2 text-left">KW</th>
                    <th className="border border-gray-300 p-2 text-left">Qtd</th>
                    <th className="border border-gray-300 p-2 text-left">Total KWh</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.resumo_ar_comprimido.tabela.map((item, index) => (
                    <tr key={index} className="hover:bg-secondary/50">
                      <td className="border border-gray-300 p-2">{item.mm_furo}</td>
                      <td className="border border-gray-300 p-2">{item.kw.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="border border-gray-300 p-2">{item.qtd}</td>
                      <td className="border border-gray-300 p-2">{item.total_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border border-gray-300 p-2" colSpan={3}>Total</td>
                    <td className="border border-gray-300 p-2">{relatorio.resumo_ar_comprimido.total_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Text */}
            <div className="mt-6 text-sm text-foreground leading-relaxed">
              <p className="mb-3">
                <span className="font-semibold">Assim teremos: AR COMPRIMIDO</span>
                <br />
                {relatorio.resumo_ar_comprimido.total_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW X {relatorio.resumo_ar_comprimido.horas_mes} horas mês = {relatorio.resumo_ar_comprimido.kwh_mes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh/mês.
                <br />
                {relatorio.resumo_ar_comprimido.kwh_mes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh/mês X R$ {relatorio.resumo_ar_comprimido.valor_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW/hora = R$ {relatorio.resumo_ar_comprimido.custo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês.
              </p>
              <p className="mb-3 font-semibold text-primary">
                O custo mensal nesta proporção de energia será de R$ {relatorio.resumo_ar_comprimido.custo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mb-3">
                {relatorio.resumo_ar_comprimido.total_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW X {relatorio.resumo_ar_comprimido.horas_ano} horas ano = {relatorio.resumo_ar_comprimido.kwh_ano.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh/ano.
                <br />
                {relatorio.resumo_ar_comprimido.kwh_ano.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh/ano X R$ {relatorio.resumo_ar_comprimido.valor_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW/hora = R$ {relatorio.resumo_ar_comprimido.custo_ano.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ano.
              </p>
              <p className="font-semibold text-primary">
                O custo anual nesta proporção de energia será de R$ {relatorio.resumo_ar_comprimido.custo_ano.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <ReportFooter />
        </div>
        )}

        {/* Vazamentos - 1 por pagina */}
        {relatorio.vibracoes && relatorio.vibracoes.length > 0 ? (
          relatorio.vibracoes.map((item, index) => {
            const fotos = Array.isArray(item.fotos) ? item.fotos : [];
            const fotosPage1 = fotos.slice(0, 3);
            const fotosRestantes = fotos.slice(3);
            const fotoPageChunks: any[][] = [];
            for (let i = 0; i < fotosRestantes.length; i += 3) {
              fotoPageChunks.push(fotosRestantes.slice(i, i + 3));
            }
            return (
              <React.Fragment key={item.id || index}>
                <div className="report-page print-break flex flex-col">
                  <div className="flex-1">
                    <ReportHeader />

                    <h2 className="report-title">DADOS DO EQUIPAMENTO {index + 1}</h2>

                    <div className="overflow-x-auto mb-6">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="border border-gray-300 p-2 text-left">#</th>
                            <th className="border border-gray-300 p-2 text-left">Área</th>
                            <th className="border border-gray-300 p-2 text-left">TAG</th>
                            <th className="border border-gray-300 p-2 text-left">Equipamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-secondary/50">
                            <td className="border border-gray-300 p-2">{index + 1}</td>
                            <td className="border border-gray-300 p-2">{item.setor || item.area || "-"}</td>
                            <td className="border border-gray-300 p-2">{item.num_vazamento || "-"}</td>
                            <td className="border border-gray-300 p-2">{item.localizacao || item.local || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Checklist table */}
                    <h2 className="report-title">ITENS INSPECIONADOS</h2>
                    {item.checklist && item.checklist.length > 0 && (
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-200 text-gray-800">
                              <th className="border border-gray-400 p-1 text-center w-6">#</th>
                              <th className="border border-gray-400 p-1 text-left">INSPEÇÃO</th>
                              <th className="border border-gray-400 p-1 text-center w-14" style={{backgroundColor: '#00b050', color: '#fff'}}>OK</th>
                              <th className="border border-gray-400 p-1 text-center w-14" style={{backgroundColor: '#ffff00', color: '#000'}}>FORA</th>
                              <th className="border border-gray-400 p-1 text-left">OBS.:</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.checklist.map((entry: any, ci: number) => {
                              const isOk = entry.situacao?.toUpperCase() === "OK";
                              return (
                                <tr key={entry.id ?? ci} className="text-xs">
                                  <td className="border border-gray-400 p-1 text-center">{ci + 1}</td>
                                  <td className="border border-gray-400 p-1">{entry.descricao}</td>
                                  <td className="border border-gray-400 p-1 text-center" style={isOk ? {backgroundColor: '#00b050'} : {}}>
                                    {isOk ? '✓' : ''}
                                  </td>
                                  <td className="border border-gray-400 p-1 text-center" style={!isOk ? {backgroundColor: '#ffff00'} : {}}>
                                    {!isOk ? '✓' : ''}
                                  </td>
                                  <td className="border border-gray-400 p-1">{entry.observacao || ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Primeiras 3 fotos na página principal */}
                    {fotosPage1.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {fotosPage1.map((foto: any, fi: number) => (
                          <div key={foto.id ?? fi} className="border border-gray-300 rounded-lg overflow-hidden">
                            <p className="vazamento-photo-title">Foto {fi + 1}</p>
                            <div className="vazamento-photo-body">
                              <img
                                src={foto.url}
                                alt={`Foto ${fi + 1} - ${item.localizacao || item.local}`}
                                className="vazamento-photo"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <ReportFooter />
                </div>

                {/* Páginas extras de fotos */}
                {fotoPageChunks.map((chunk, chunkIndex) => {
                  const startNum = fotosPage1.length + chunkIndex * 3 + 1;
                  return (
                    <div key={`fotos-${index}-${chunkIndex}`} className="report-page print-break flex flex-col">
                      <div className="flex-1">
                        <ReportHeader />
                        <h2 className="report-title">DADOS DO EQUIPAMENTO {index + 1} - Fotos (continuação)</h2>
                        <div className="grid grid-cols-3 gap-2">
                          {chunk.map((foto: any, fi: number) => {
                            const fotoNum = startNum + fi;
                            return (
                              <div key={foto.id ?? fi} className="border border-gray-300 rounded-lg overflow-hidden">
                                <p className="vazamento-photo-title">Foto {fotoNum}</p>
                                <div className="vazamento-photo-body">
                                  <img
                                    src={foto.url}
                                    alt={`Foto ${fotoNum} - ${item.localizacao || item.local}`}
                                    className="vazamento-photo"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <ReportFooter />
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })
        ) : (
          <div className="report-page print-break flex flex-col">
            <div className="flex-1">
              <ReportHeader />
              <h2 className="report-title">RELATÓRIO DE MANUTENÇÃO</h2>
              <div className="border border-gray-300 p-4 text-center text-muted-foreground">
                Nenhum equipamento registrado
              </div>
            </div>
            <ReportFooter />
          </div>
        )}

        {/* Final Considerations */}
        <div className="report-page print-break flex flex-col">
          <div className="flex-1">
            <ReportHeader />
          
          <h2 className="report-title">CONSIDERAÇÕES FINAIS</h2>
          
          <div className="bg-secondary/30 rounded-lg p-6 mb-8">
            <p className="text-foreground leading-relaxed mb-4">
                <p>Sugestões: </p>
                <p> 1) Solucionar os desvios encontrados para garantir a confiabilidade do equipamento. </p>
                <p>2) Avaliar se há necessidade de implementar ou revisar o plano de manutenção</p>
                <p>3) Analisar os comentários deixado no campo observação de cada equipamento. </p>
                
            </p>
            <p className="text-primary font-semibold">
              Muito obrigado pela confiança.
            </p>
          </div>

          {executorData && (
            <div className="mb-8">
              <p className="mb-4">Atenciosamente,</p>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">{executorData.nome}</p>
                <p className="text-muted-foreground text-sm">{executorData.departamento}</p>
                <p className="text-sm mt-2">{executorData.email}</p>
                {executorData.telefone && <p className="text-sm">Tel.: {executorData.telefone}</p>}
              </div>
            </div>
          )}

          {aprovadorData && (
            <div className="mb-8">
              <p className="mb-4">Aprovado por,</p>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">{aprovadorData.nome}</p>
                <p className="text-muted-foreground text-sm">{aprovadorData.departamento}</p>
                <p className="text-sm mt-2">{aprovadorData.email}</p>
                {aprovadorData.telefone && <p className="text-sm">Tel.: {aprovadorData.telefone}</p>}
              </div>
            </div>
          )}
          </div>
          <ReportFooter />
        </div>

        {/* Services Page */}
        <div className="report-page flex flex-col">
          <div className="flex-1">
            <ReportHeader />
            
            <h2 className="report-title">NOSSOS SERVIÇOS</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[{
              title: "Análise de Vibrações",
              desc: "Off-line e on-line, solo e estrutural"
            }, {
              title: "Inspeção Termográfica",
              desc: "Painéis, cabines, fornos, mancais, etc."
            }, {
              title: "Alinhamento a Laser",
              desc: "De eixos e polias + calços calibrados"
            }, {
              title: "Balanceamento Dinâmico",
              desc: "Realizado no local – 1 a 4 planos"
            }, {
              title: "ODS (Estrutural)",
              desc: "Análise de torção de base com correção"
            }, {
              title: "MCA – Inspeção Elétrica",
              desc: "Avaliação de circuitos em motores elétricos"
            }, {
              title: "Análise de Óleo",
              desc: "Lubrificante / pacote industrial"
            }, {
              title: "Técnicas Multiparâmetro",
              desc: "Aplicação de diversas técnicas preditivas"
            }, {
              title: "Treinamentos de Preditiva",
              desc: "Análise de vibração e Termografia – N1"
            }, {
              title: "Monitoramento Online",
              desc: "Sensor online de vibração"
            }, {
              title: "Inspeção Ultrassônica",
              desc: "Ar comprimido, vapor, gases e elétrica"
            }, {
              title: "Inspeção Sensitiva",
              desc: "Abordagem para identificar falhas incipientes"
            }].map((service, index) => <div key={index} className="info-card hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-primary">{service.title}</h4>
                  <p className="text-sm text-muted-foreground">{service.desc}</p>
                </div>)}
            </div>
            <ReportFooter />
          </div>
        </div>

      </div>
    </div>
};
export default Index;