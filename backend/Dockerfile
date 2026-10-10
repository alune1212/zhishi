FROM postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777 AS postgres-tools

FROM ghcr.io/astral-sh/uv:0.12.19-python3.12-alpine@sha256:23ab7187a462696e85e168d2a042493d45c8d06c8a90d9aa820b8b83da09f118

WORKDIR /app

RUN apk upgrade --no-cache \
    && apk add --no-cache \
        ca-certificates \
        krb5-libs \
        libldap \
        libsasl \
        lz4-libs \
        zlib \
        zstd-libs \
    && uv pip uninstall --python /usr/local/bin/python pip \
    && rm -rf /usr/local/lib/python3.12/ensurepip

COPY --from=postgres-tools /usr/local/bin/pg_dump /usr/local/bin/pg_dump
COPY --from=postgres-tools /usr/local/bin/pg_restore /usr/local/bin/pg_restore
COPY --from=postgres-tools /usr/local/lib/libpq.so.5* /usr/local/lib/
ENV LD_LIBRARY_PATH=/usr/local/lib
RUN pg_dump --version | grep -Eq '^pg_dump \(PostgreSQL\) 16\.' \
    && pg_restore --version | grep -Eq '^pg_restore \(PostgreSQL\) 16\.'

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
