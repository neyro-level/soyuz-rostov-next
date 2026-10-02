# Союз застройщиков Ростов — Timeweb deployment placeholders

These files are project-specific placeholders for the future release of `souz-rostov-realty`.

```text
Final domain: souz-home.ru
Technical host: soyuz-rostov.tw1.ru
Server alias: szrostov
Secret scope: szrostov-server/prod for server access; app runtime secrets stay project-specific
```

No secret value belongs in this directory. Fill runtime env from Secret Master into a root-only server env file during an explicit release.

## Suggested server paths

```text
app dir: /opt/souz-rostov
compose: /opt/souz-rostov/compose.yml
env: /etc/souz-rostov/app.env
nginx: /etc/nginx/sites-available/souz-rostov.conf
```

## Indexing

Keep `X-Robots-Tag: noindex, nofollow` on `soyuz-rostov.tw1.ru`. Remove noindex for `souz-home.ru` only after owner cutover decision and `productionIndexing` promotion to `public`.
