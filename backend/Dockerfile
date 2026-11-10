# Backend (Django + uv) — dev image, deps first so code edits don't reinstall anything
FROM python:3.13-slim

# mysqlclient needs the headers + linker to build (no wheel guaranteed for 3.13-slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# uv to resolve/install the project exactly as on the host
RUN pip install --no-cache-dir uv==0.12.0

# 1) lockfile + project metadata only -> dependency layer is cached
COPY pyproject.toml uv.lock ./
# 2) container venv lives in a named volume (see compose) so the host bind
#    mount can't mask it; first boot re-syncs into that empty volume

RUN uv sync --frozen --no-install-project

# 3) code — bind-mounted in dev, but keep a copy for clean image runs
COPY . .

EXPOSE 8000

CMD ["uv", "run", "--frozen", "python", "manage.py", "runserver", "0.0.0.0:8000"]
