'use client'

interface PrintProfile {
  name?: string
  email?: string
  cnpj?: string
  city?: string
}

interface PrintSectionProps {
  id: string
  title: string
  profile?: PrintProfile | null
  children: React.ReactNode
}

export function PrintSection({ id, title, profile, children }: PrintSectionProps) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #${id}, #${id} * { visibility: visible !important; }
          #${id} { position: fixed; inset: 0; padding: 32px; background: #fff; color: #000; overflow: auto; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id={id}>
        {/* Print header — visible only on print */}
        <div className="hidden print:block mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" width={40} height={40} alt="MEI Control Pro" style={{ borderRadius: 8 }} />
              <div>
                <p className="font-bold text-gray-900 text-lg">MEI Control Pro</p>
                <p className="text-gray-500 text-xs">Gestão Financeira para MEI</p>
              </div>
            </div>
            {profile && (
              <div className="text-right text-xs text-gray-500">
                {profile.name && <p className="font-semibold text-gray-700">{profile.name}</p>}
                {profile.cnpj && <p>CNPJ: {profile.cnpj}</p>}
                {profile.email && <p>{profile.email}</p>}
                {profile.city && <p>{profile.city}</p>}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-xl">{title}</h2>
            <p className="text-xs text-gray-400">
              Emitido em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {children}

        {/* Print footer */}
        <div className="hidden print:block mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Documento gerado pelo MEI Control Pro · app.sismeipro.com.br · CNPJ 50.406.025/0001-68</p>
          <p className="text-xs text-gray-400">Este é um serviço privado de assessoria — não possui vínculo com o governo federal.</p>
        </div>
      </div>
    </>
  )
}
