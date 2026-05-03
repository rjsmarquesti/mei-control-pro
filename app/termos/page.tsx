import Link from 'next/link'

export const metadata = { title: 'Termos de Uso — MEI Control Pro' }

export default function TermosPage() {
  return (
    <div style={{ background: '#0b0b18', minHeight: '100vh', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#7C3AED', fontSize: 13, textDecoration: 'none' }}>← Voltar</Link>
        </div>

        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Termos de Uso</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 40 }}>Última atualização: abril de 2025</p>

        <div style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.8 }}>

          <Section title="1. Sobre o Serviço">
            <p>O MEI Control Pro é um serviço <strong>privado</strong> de assessoria e gestão financeira para Microempreendedores Individuais (MEI), operado pela empresa com CNPJ <strong>50.406.025/0001-68</strong>.</p>
            <p style={{ marginTop: 12 }}>Este serviço <strong>não possui qualquer vínculo</strong> com o governo federal, Receita Federal, INSS, Sebrae ou qualquer outro órgão público. Não somos representantes oficiais do governo e não realizamos serviços exclusivos de órgãos públicos.</p>
          </Section>

          <Section title="2. Aceitação dos Termos">
            <p>Ao criar uma conta e utilizar o MEI Control Pro, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde, não utilize o serviço.</p>
          </Section>

          <Section title="3. Descrição dos Serviços">
            <p>O MEI Control Pro oferece:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Controle de receitas e despesas</li>
              <li>Alertas de vencimento do DAS (Documento de Arrecadação do Simples Nacional)</li>
              <li>Monitoramento do limite de faturamento MEI</li>
              <li>Relatórios para auxiliar na declaração do IRPF</li>
              <li>Suporte via e-mail e WhatsApp</li>
            </ul>
            <p style={{ marginTop: 12 }}>Os serviços têm caráter exclusivamente informativo e organizacional. Não prestamos serviços contábeis, jurídicos ou tributários regulamentados.</p>
          </Section>

          <Section title="4. Cadastro e Conta">
            <p>Para utilizar o serviço, você deve fornecer informações verídicas e manter seus dados atualizados. É responsabilidade do usuário manter a confidencialidade de sua senha.</p>
          </Section>

          <Section title="5. Planos e Pagamentos">
            <p>O MEI Control Pro oferece planos gratuito e pagos. Os valores e condições de cada plano estão descritos na página de assinatura. Pagamentos são processados pelo Mercado Pago, sujeitos aos termos desse serviço.</p>
            <p style={{ marginTop: 12 }}>Não realizamos reembolsos de períodos já utilizados, exceto em casos previstos pelo Código de Defesa do Consumidor.</p>
          </Section>

          <Section title="6. Limitações de Responsabilidade">
            <p>O MEI Control Pro não se responsabiliza por:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>Multas, juros ou penalidades decorrentes do não pagamento do DAS ou de obrigações fiscais</li>
              <li>Decisões tomadas com base nas informações do sistema</li>
              <li>Interrupções temporárias do serviço por manutenção ou causas externas</li>
            </ul>
          </Section>

          <Section title="7. Cancelamento">
            <p>Você pode cancelar sua assinatura a qualquer momento através do painel de controle ou via suporte. O acesso permanece ativo até o final do período pago.</p>
          </Section>

          <Section title="8. Contato">
            <p>Dúvidas sobre estes termos: <a href="mailto:suporte@sismeipro.com.br" style={{ color: '#7C3AED' }}>suporte@sismeipro.com.br</a></p>
          </Section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: '#374151', fontSize: 11 }}>
            © 2025 MEI Control Pro · CNPJ 50.406.025/0001-68 ·{' '}
            <Link href="/privacidade" style={{ color: '#7C3AED', textDecoration: 'none' }}>Política de Privacidade</Link>
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
