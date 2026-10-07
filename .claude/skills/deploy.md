# Skill: Deploy — MEI Control Pro

Workflow de build e push da imagem Docker.

## Pré-requisito
Rodar `npx tsc --noEmit` — deve retornar zero erros antes de buildar.

## Gerar tag
Formato: `YYYYMMDD[letra]` (ex: `20260509a`)
Verificar a última tag usada e incrementar a letra.
Última conhecida: `20260508a`

## Comando de build (OBRIGATÓRIO: passar build-args para vars NEXT_PUBLIC_*)
```bash
cd C:\Users\Rogério\mei-control-pro
docker build --no-cache \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=https://db.divulgabr.com.br" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>" \
  --build-arg "NEXT_PUBLIC_APP_URL=https://app.sismeipro.com.br" \
  -t rjsmarquesti/mei-control-pro:[TAG] .
```

**Por quê --build-arg:** Next.js inlina vars `NEXT_PUBLIC_*` no bundle durante o build. Sem isso, URL antiga pode ficar hardcoded no JS compilado, quebrando Mercado Pago.

## Push
```bash
docker push rjsmarquesti/mei-control-pro:[TAG]
```

## Após o push
1. Informar tag gerada ao usuário
2. Instruir: EasyPanel → producao → app → Implantar (com a nova tag)
3. Atualizar `MEMORY/wake-up.md` com "Último deploy: [data] — tag [TAG]"
