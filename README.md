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
