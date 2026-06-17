import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — MEI Control Pro App Android',
  description: 'Política de privacidade do aplicativo Android MEI Control Pro, em conformidade com a LGPD e as políticas do Google Play.',
}

export default function PrivacidadeAppPage() {
  return (
    <div style={{ background: '#0b0b18', minHeight: '100vh', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#7C3AED', fontSize: 13, textDecoration: 'none' }}>← Voltar</Link>
        </div>

        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 4 }}>MEI Control Pro — Aplicativo Android</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 40 }}>Última atualização: 16 de junho de 2026</p>

        <div style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.8 }}>

          <Section title="1. Identificação">
            <p>O <strong style={{ color: '#fff' }}>MEI Control Pro</strong> é desenvolvido e operado por <strong style={{ color: '#fff' }}>CNPJ 50.406.025/0001-68</strong>, com sede no Brasil.</p>
            <p style={{ marginTop: 8 }}>Contato: <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
            <p style={{ marginTop: 8 }}>Esta política está em conformidade com a <strong style={{ color: '#fff' }}>LGPD (Lei nº 13.709/2018)</strong> e com as <strong style={{ color: '#fff' }}>Políticas do Google Play</strong>.</p>
          </Section>

          <Section title="2. Princípio fundamental: seus dados ficam no seu dispositivo">
            <p>O MEI Control Pro é um aplicativo <strong style={{ color: '#fff' }}>offline-first</strong>. Todos os dados fiscais que você insere — receitas, despesas, DAS, CNPJ — são armazenados <strong style={{ color: '#fff' }}>exclusivamente no seu dispositivo</strong>, em banco de dados local (SQLite).</p>
            <p style={{ marginTop: 8 }}>Não possuímos acesso a esses dados e não os transmitimos para nenhum servidor.</p>
            <p style={{ marginTop: 8 }}>O aplicativo realiza uma única chamada de rede para obter <strong style={{ color: '#fff' }}>configurações públicas atualizadas</strong> (valor do DAS, limite anual MEI e tabela do IRPF) a partir de <code style={{ color: '#a78bfa' }}>app.sismeipro.com.br/api/mei-config</code>. <strong style={{ color: '#fff' }}>Nenhum dado pessoal é enviado nessa requisição.</strong> O app funciona normalmente sem rede, usando os valores padrão embutidos.</p>
          </Section>

          <Section title="3. Dados coletados e finalidade">
            <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>3.1 Dados que coletamos diretamente</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.3)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Dado</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Finalidade</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Onde fica</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px' }}><strong style={{ color: '#fff' }}>E-mail</strong></td>
                  <td style={{ padding: '8px 12px' }}>Validar o código de ativação da licença</td>
                  <td style={{ padding: '8px 12px' }}>Dispositivo local</td>
                </tr>
              </tbody>
            </table>
            <p>O e-mail não é usado para marketing e não é compartilhado com terceiros.</p>

            <p style={{ marginTop: 16, marginBottom: 8 }}><strong style={{ color: '#fff' }}>3.2 Dados inseridos por você (não acessamos)</strong></p>
            <p style={{ marginBottom: 8 }}>Armazenados apenas no seu dispositivo. Não temos acesso a eles:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Razão social, CNPJ, telefone e endereço do seu MEI</li>
              <li>Lançamentos de receitas e despesas</li>
              <li>Registros de pagamento do DAS</li>
              <li>Configurações pessoais do aplicativo</li>
            </ul>

            <p style={{ marginTop: 16, marginBottom: 8 }}><strong style={{ color: '#fff' }}>3.3 Dados que não coletamos</strong></p>
            <p>Não coletamos: localização, contatos, câmera, microfone, histórico de navegação, dados biométricos ou identificadores para rastreamento e publicidade.</p>
          </Section>

          <Section title="4. Terceiros envolvidos">
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#fff' }}>4.1 Mercado Pago</strong></p>
            <p>A compra do aplicativo é processada pelo Mercado Pago. Os dados de pagamento são tratados exclusivamente por eles, conforme a <a href="https://www.mercadopago.com.br/privacidade" target="_blank" style={{ color: '#7C3AED' }}>política de privacidade do Mercado Pago</a>. Não armazenamos dados de pagamento.</p>

            <p style={{ marginTop: 16, marginBottom: 8 }}><strong style={{ color: '#fff' }}>4.2 Google Drive (Android Auto Backup)</strong></p>
            <p>O aplicativo utiliza o mecanismo nativo do Android chamado <strong style={{ color: '#fff' }}>Auto Backup</strong>, que salva automaticamente os dados do app no Google Drive da <strong style={{ color: '#fff' }}>sua própria conta Google</strong> — quando o dispositivo está carregando e conectado ao Wi-Fi.</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>O backup fica na sua conta pessoal do Google — não em servidores nossos</li>
              <li>Não temos acesso ao conteúdo do seu backup</li>
              <li>O código de ativação da licença <strong style={{ color: '#fff' }}>não é incluído no backup</strong> por segurança</li>
            </ul>
            <p style={{ marginTop: 8 }}>Sujeito à <a href="https://policies.google.com/privacy" target="_blank" style={{ color: '#7C3AED' }}>Política de Privacidade do Google</a>.</p>
          </Section>

          <Section title="5. Permissões do aplicativo">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.3)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Permissão</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px' }}>Notificações</td>
                  <td style={{ padding: '8px 12px' }}>Alertas locais sobre vencimento do DAS</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px' }}>Armazenamento (leitura)</td>
                  <td style={{ padding: '8px 12px' }}>Compartilhar PDFs gerados pelo app</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}>Não solicitamos câmera, localização, contatos ou microfone.</p>
          </Section>

          <Section title="6. Proteção de dados sensíveis">
            <ul style={{ paddingLeft: 20 }}>
              <li><strong style={{ color: '#fff' }}>Bloqueio de captura de tela</strong> nas telas de DAS, Financeiro e IRPF — impedindo screenshots de dados fiscais</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#fff' }}>Limite de tentativas de ativação</strong> — 5 tentativas incorretas bloqueiam o app por 30 minutos</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#fff' }}>Código de ativação excluído</strong> do backup automático — impede transferência de licença entre dispositivos</li>
            </ul>
          </Section>

          <Section title="7. Seus direitos (LGPD)">
            <p>Você tem direito a:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong style={{ color: '#fff' }}>Acessar</strong> seus dados pessoais (apenas e-mail de ativação)</li>
              <li><strong style={{ color: '#fff' }}>Corrigir</strong> dados incorretos</li>
              <li><strong style={{ color: '#fff' }}>Excluir</strong> seus dados dos nossos registros</li>
              <li><strong style={{ color: '#fff' }}>Portabilidade</strong> dos dados</li>
              <li><strong style={{ color: '#fff' }}>Revogar</strong> o consentimento a qualquer momento</li>
            </ul>
            <p style={{ marginTop: 12 }}>Os dados fiscais no app estão 100% sob seu controle: <strong style={{ color: '#fff' }}>Configurações → Apagar todos os dados</strong>.</p>
            <p style={{ marginTop: 8 }}>Para exercer seus direitos: <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
          </Section>

          <Section title="8. Retenção de dados">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.3)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Dado</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', borderBottom: '1px solid rgba(124,58,237,0.4)' }}>Retenção</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px' }}>E-mail de ativação</td>
                  <td style={{ padding: '8px 12px' }}>Mantido para suporte. Excluído mediante solicitação.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 12px' }}>Dados fiscais no app</td>
                  <td style={{ padding: '8px 12px' }}>No seu dispositivo. Excluídos ao desinstalar ou usar "Apagar tudo".</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px' }}>Backup no Google Drive</td>
                  <td style={{ padding: '8px 12px' }}>Controlado pela sua conta Google.</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="9. Crianças">
            <p>Este aplicativo é destinado a MEIs maiores de 18 anos. Não coletamos dados de menores de idade.</p>
          </Section>

          <Section title="10. Alterações nesta política">
            <p>Atualizações relevantes serão comunicadas via atualização do aplicativo. A data no topo desta página sempre reflete a versão atual.</p>
          </Section>

          <Section title="11. Contato e DPO">
            <p><strong style={{ color: '#fff' }}>Encarregado de Proteção de Dados (DPO):</strong><br />
            <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
          </Section>

        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 48, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ color: '#4b5563', fontSize: 12 }}>© 2026 MEI Control Pro · CNPJ 50.406.025/0001-68</p>
          <Link href="/privacidade" style={{ color: '#6b7280', fontSize: 12, textDecoration: 'none' }}>Política do Site (SaaS)</Link>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(124,58,237,0.3)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
