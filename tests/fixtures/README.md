# Test fixtures

`search-index.json` is the backend's `GET /api/memorial/search-index/` output for the
synthetic `search_demo` fixture (invented people modeled on real data patterns). Unit
tests, golden relevance tests, and the mocked e2e use it; the full-stack e2e job loads
the same fixture into a real backend, so both modes see identical data.

Regenerate after changing `vmi-wd-backend/memorial/fixtures/search_demo.json` or the
index shape (run from `vmi-wd-backend`, against a throwaway sqlite file):

```sh
export SECRET_KEY=dev DEBUG=True DATABASE_URL=sqlite:////tmp/search-demo.sqlite3
python manage.py migrate -v0 && python manage.py loaddata -v0 search_demo
python manage.py shell -c "import json; from memorial.search_index import build_search_index; \
print(json.dumps(build_search_index(), ensure_ascii=False, indent=1))" \
  > ../vmi-wd-frontend/tests/fixtures/search-index.json
```
