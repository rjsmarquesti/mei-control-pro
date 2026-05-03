import Link from 'next/link'

export const metadata = { title: 'Política de Privacidade — MEI Control Pro' }

export default function PrivacidadePage() {
  return (
    <div style={{ background: '#0b0b18', minHeight: '100vh', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#7C3AED', fontSize: 13, textDecoration: 'none' }}>← Voltar</Link>
        </div>

        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 40 }}>Última atualização: abril de 2025</p>

        <div style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.8 }}>

          <Section title="1. Quem somos">
            <p>O MEI Control Pro é operado pela empresa com CNPJ <strong>50.406.025/0001-68</strong>, com sede no Brasil. Esta política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p>Coletamos apenas os dados necessários para a prestação do serviço:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Cadastro:</strong> nome, e-mail, telefone e cidade</li>
              <li><strong>Financeiros:</strong> receitas e despesas que você mesmo insere</li>
              <li><strong>Pagamentos:</strong> dados de pagamento processados pelo Mercado Pago (não armazenamos cartões)</li>
              <li><strong>Uso:</strong> logs de acesso para segurança e melhoria do serviço</li>
            </ul>
          </Section>

          <Section title="3. Como usamos seus dados">
            <p>Seus dados são usados exclusivamente para:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Prestar os serviços contratados</li>
              <li>Enviar alertas e notificações relacionados ao seu MEI</li>
              <li>Processar pagamentos</li>
              <li>Melhorar a plataforma</li>
              <li>Cumprir obrigações legais</li>
            </ul>
            <p style={{ marginTop: 12 }}>Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais.</p>
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p>Compartilhamos dados apenas com:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Mercado Pago:</strong> para processamento de pagamentos</li>
              <li><strong>Supabase:</strong> infraestrutura de banco de dados (servidores no Brasil/EUA)</li>
              <li><strong>Autoridades competentes:</strong> quando exigido por lei</li>
            </ul>
          </Section>

          <Section title="5. Seus direitos (LGPD)">
            <p>Você tem direito a:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Portabilidade dos dados</li>
            </ul>
            <p style={{ marginTop: 12 }}>Para exercer esses direitos, entre em contato: <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
          </Section>

          <Section title="6. Segurança">
            <p>Utilizamos criptografia, autenticação segura e boas práticas de segurança para proteger seus dados. Em caso de incidente de segurança, notificaremos os usuários afetados conforme exigido pela LGPD.</p>
          </Section>

          <Section title="7. Cookies">
            <p>Utilizamos cookies essenciais para manter sua sessão ativa. Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>
          </Section>

          <Section title="8. Retenção de dados">
            <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após o cancelamento, excluímos seus dados em até 90 dias, exceto quando a retenção for exigida por lei.</p>
          </Section>

          <Section title="9. Contato">
            <p>Encarregado de Proteção de Dados (DPO): <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
          </Section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: '#374151', fontSize: 11 }}>
            © 2025 MEI Control Pro · CNPJ 50.406.025/0001-68 ·{' '}
            <Link href="/termos" style={{ color: '#7C3AED', textDecoration: 'none' }}>Termos de Uso</Link>
          </p>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}
