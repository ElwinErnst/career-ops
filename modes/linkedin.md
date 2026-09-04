# Modo: linkedin — LinkedIn Monitor Import

Consume el feed generado por el monitor de LinkedIn Jobs y lo integra al pipeline normal de career-ops.

## Objetivo

Usar `data/linkedin-jobs.jsonl` como fuente externa de ofertas ya descubiertas por el monitor, sin volver a buscar LinkedIn ni duplicar lógica de descubrimiento.

## Workflow

1. Verificar que exista `data/linkedin-jobs.jsonl`.
2. Ejecutar:

```bash
node import-linkedin-monitor.mjs
```

3. Leer el resumen de importación.
4. Si se agregaron 1 o más ofertas nuevas a `data/pipeline.md`, procesarlas usando el flujo de `pipeline`.
5. Si no se agregó ninguna oferta nueva, informar que el feed está sincronizado y no hay nuevas vacantes pendientes.

## Reglas

- No volver a buscar ofertas en LinkedIn desde este modo.
- No modificar manualmente `scan-history.tsv`; el importador es la fuente de verdad para esa escritura.
- Respetar la deduplicación por URL canónica.
- Mantener `data/linkedin-jobs.jsonl`, `data/pipeline.md` y `data/scan-history.tsv` como datos de usuario.
- Si una oferta del feed está marcada como `active: false` o `status: expired`, no enviarla al pipeline.

## Salida esperada

```text
LinkedIn Monitor Sync
━━━━━━━━━━━━━━━━━━━━━
Feed records: N
Nuevas añadidas: N
Duplicadas: N
Expiradas: N
Inválidas: N

→ Si hay nuevas: continuar automáticamente con career-ops pipeline.
```
