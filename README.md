# WFMM L14 Cell Status

A userscript for [Wayfarer Map Mods (WFMM)](https://gitlab.com/Tntnnbltn/wayfarer-map-mods) that helps keep track of potential PokéStop locations using S2 Level 14 cells.

You can mark each cell based on how many PokéStop candidates are still available.

## Features

### Cell Status

Each cell can be marked with one of three colors:

- 🔴 **None** — No candidates left.
- 🔵 **Little** — A few candidates remaining.
- 🟢 **Plenty** — Plenty of candidates remaining.

### Other Features

- Click on the map to mark cells or change their status.
- Remove a cell's status using the Clear option.
- See how many cells are marked with each color.
- Changes are saved locally and remain after refreshing the page.
- The counter sits next to the map selection menu and adjusts its position when switching map types.
- Supports WFMM's backup and restore feature.
- Works with Tampermonkey on PC and Userscripts on iPhone Safari.

Cell statuses are stored in your browser. They don't automatically sync between devices.

## Installation and updates

1. Install [Wayfarer Map Mods (WFMM)](https://gitlab.com/Tntnnbltn/wayfarer-map-mods) first; this add-on requires WFMM's external plugin API v1.
2. Install the [latest userscript](https://raw.githubusercontent.com/jjh317/wayfarer-l14-density-tracker/main/wfmm-l14-cell-status.user.js) with your userscript manager. This fixed URL is the official distribution path from v1.2.12 onward.

- **Existing v1.2.11 users:** pasted code and installations from the old versioned GitHub URL do not automatically discover the new URL. Once, open the latest link and replace/update the existing script, or replace its entire code with the new file. Keep only one enabled copy across your userscript managers; if installation creates a separate entry, disable the old one before enabling the new one, then reload Wayfarer. The script name, namespace and plugin ID are unchanged. The WFMM storage name, record structure and backup settings are also unchanged; this release adds no data migration or reset. Keep using the same browser profile and Wayfarer site to retain access to your local cell data.
- **Tampermonkey:** with script updates enabled, its built-in version checks use `@updateURL` and download newer versions from `@downloadURL`. Both point to the fixed file; timing depends on Tampermonkey settings and network access. See the [official update metadata documentation](https://www.tampermonkey.net/documentation.php?locale=en&q=update_url).
- **iPhone Safari Userscripts:** update checking and installation depend on the app version and settings; unattended automatic updating equivalent to Tampermonkey is not guaranteed. Check the extension popup and apply an offered update. If none is offered, replace the existing script using the latest link and keep only one enabled copy. See the [Userscripts instructions](https://github.com/quoid/userscripts#usage) and [release notes](https://github.com/quoid/userscripts/releases).
- **Future releases:** update the fixed file and increase both its `@version` and internal plugin version. The v1.2.11 file is retained as an archive, not the latest installation link.

---

# 한국어

Wayfarer Map Mods(WFMM)에서 S2 레벨 14 셀마다 포켓스톱 후보가 얼마나 남아 있는지 표시할 수 있는 유저스크립트입니다.

포켓스톱을 추가할 만한 장소가 남아 있는지 셀별로 구분하고, 나중에 다시 확인할 수 있도록 만들었습니다.

## 기능

### 셀 상태 표시

각 셀은 세 가지 색상으로 구분할 수 있습니다.

- 🔴 **None (없음)** — 더 이상 추가할 후보가 없는 셀
- 🔵 **Little (조금)** — 추가할 후보가 조금 남아 있는 셀
- 🟢 **Plenty (많음)** — 추가할 후보가 많이 남아 있는 셀

### 기타 기능

- 지도에서 셀을 클릭해 색상을 지정하거나 변경할 수 있습니다.
- Clear를 선택하면 지정한 색상을 삭제할 수 있습니다.
- 색상별로 표시된 셀 개수를 확인할 수 있습니다.
- 변경한 내용은 브라우저에 자동 저장되며 새로고침 후에도 유지됩니다.
- 지도 선택 메뉴 옆에 카운터가 표시되고, 지도 종류를 바꾸면 위치가 자동으로 조정됩니다.
- WFMM의 백업 및 복원 기능을 지원합니다.
- PC Tampermonkey와 iPhone Safari Userscripts에서 사용할 수 있습니다.

셀 상태는 브라우저에 저장되며, 다른 기기와 자동으로 동기화되지는 않습니다.

## 설치 및 업데이트

1. [Wayfarer Map Mods(WFMM)](https://gitlab.com/Tntnnbltn/wayfarer-map-mods)를 먼저 설치해야 합니다. 이 플러그인은 WFMM 외부 플러그인 API v1이 필요합니다.
2. 유저스크립트 관리자로 [최신 유저스크립트](https://raw.githubusercontent.com/jjh317/wayfarer-l14-density-tracker/main/wfmm-l14-cell-status.user.js)를 설치합니다. v1.2.12부터 이 고정 URL을 정식 배포 경로로 사용합니다.

- **기존 v1.2.11 사용자:** 코드 붙여넣기나 이전 버전별 GitHub URL로 설치한 스크립트가 새 URL을 자동으로 인식하지는 않습니다. 최초 한 번 최신 링크를 열어 기존 스크립트를 교체·업데이트하거나, 기존 스크립트의 전체 코드를 새 파일 내용으로 교체하세요. 여러 유저스크립트 관리자를 포함해 활성 복사본은 하나만 유지하세요. 별도 항목으로 설치되면 기존 항목을 비활성화한 뒤 새 항목을 활성화하고 Wayfarer를 새로고침하세요. 스크립트 이름·namespace·플러그인 ID, WFMM 저장소 이름·레코드 구조·백업 설정은 유지되며 데이터 마이그레이션이나 초기화는 추가하지 않습니다. 기존 셀 데이터에 접근하려면 같은 브라우저 프로필과 Wayfarer 사이트를 사용하세요.
- **Tampermonkey:** 스크립트 업데이트가 활성화되어 있으면 내장 버전 확인 기능이 `@updateURL`로 확인하고 `@downloadURL`에서 새 버전을 받습니다. 두 주소 모두 고정 파일을 가리키며, 확인 시점은 Tampermonkey 설정과 네트워크 연결에 따라 달라집니다. [공식 업데이트 메타데이터 문서](https://www.tampermonkey.net/documentation.php?locale=en&q=update_url)를 참고하세요.
- **iPhone Safari Userscripts:** 앱 버전과 설정에 따라 업데이트 확인·설치 동작이 다르므로 Tampermonkey와 같은 무인 자동 업데이트를 보장하지 않습니다. 확장 팝업에서 제공되는 업데이트를 적용하세요. 표시되지 않으면 최신 링크로 기존 스크립트를 교체하고 활성 복사본은 하나만 유지하세요. [Userscripts 사용 안내](https://github.com/quoid/userscripts#usage)와 [릴리스 안내](https://github.com/quoid/userscripts/releases)를 참고하세요.
- **향후 배포:** 고정 파일을 갱신하고 `@version`과 내부 플러그인 버전을 함께 올립니다. 기존 v1.2.11 파일은 보관용이며 최신 설치 링크가 아닙니다.
