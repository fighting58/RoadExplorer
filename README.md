# RoadExplorer

RoadExplorer는 `.xlsx`/`.dbf` 파일의 좌표 데이터를 읽어,  
네이버 파노라마와 정적 지도(Static Map)를 함께 확인하는 로컬 웹 도구입니다.

## 주요 기능

- 파일 업로드 지원: `.xlsx`, `.dbf`
- 레코드 이동: 이전/다음 버튼, 좌/우 방향키, FID 직접 입력
- 파노라마 표시: 현재 좌표 기준 로드
- 정적 지도 표시: `/map-proxy`를 통한 ID-KEY 방식 호출
- 필드 선택/조회:
  - 상단에서 필드 체크박스 선택
  - 하단 표에서 선택 필드 값 확인(전치 형태)

## 프로젝트 구조

- `index.html`: 메인 UI
- `index.css`: 스타일
- `app.js`: 프론트엔드 로직
- `server.py`: 정적 파일 서버 + Static Map 프록시(`/map-proxy`)
- `run.bat`, `run.ps1`: 로컬 실행 스크립트
- `auth.js.example`, `auth.json.example`: 인증 설정 예시

## 실행 방법

### 방법 1) 배치 파일 실행(권장, Windows)

```bat
run.bat
```

### 방법 2) 직접 실행

```bash
python server.py
```

실행 후 브라우저에서 `http://localhost:8000` 접속

## 인증 설정

1. 네이버 클라우드 플랫폼(NCP)에서 지도 API 키 준비
2. `auth.js.example`를 참고해 `auth.js` 작성
3. NCP 콘솔의 Web 서비스 URL에 아래 등록
   - `http://localhost:8000/`
   - `http://127.0.0.1:8000/` (권장)

## 참고

- `auth.js`, `auth.json`, `deploy/`, `reference/`, `test.xlsx`는 `.gitignore`로 제외되어 있습니다.
- `server.py` 내부의 키 하드코딩은 운영 환경에서 권장되지 않습니다. 배포 시 환경변수 또는 별도 비밀 관리 방식 사용을 권장합니다.
