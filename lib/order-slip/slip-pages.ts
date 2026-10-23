// 現場用伝票の明細を、印刷のページに分ける（docs/screen-design.md「現場用伝票の印刷」の「ページの分け方」）。
//
// 用紙は A4 の横。1 ページに入る行数（材料の行と加工の行を合わせた数）を決めておき、ここで分ける。
// ブラウザに任せず自分で分けるのは、ページ番号（1/2）と上部の項目を、どのページにも同じ形で出すため
// （ブラウザの自動の改ページでは、ページごとに上部を出したり、ページ番号を出したりする方法がブラウザによって違う）。
//
// 材料の行と、その下の加工の行は、できるだけ同じページに置く（加工の行だけが次のページに回ると、
// どの材料の加工か分からなくなるため）。1 つの材料の行と加工の行で 1 ページを超えるときだけ、途中で分ける。

import type { SlipLine } from './types'

// A4 の横の 1 ページに入る明細の行数。用紙の余白を除いた高さ 193mm から、上部の項目（約 30mm）・表の見出し（7mm）・
// 合計の欄（約 6mm）を除くと、行の高さ 8mm で 18 行ほど入る。端数の余裕を残して 15 行にする。
// 印刷してみて行数を変えたいときは、この値だけを直す（空の行もこの数まで並べる）
export const SLIP_ROWS_PER_PAGE = 15

// 材料の行と、その下の加工の行をまとめる
function groupLines(lines: readonly SlipLine[]): SlipLine[][] {
  const groups: SlipLine[][] = []
  for (const line of lines) {
    if (line.kind === 'material' || groups.length === 0) {
      groups.push([line])
    } else {
      groups[groups.length - 1].push(line)
    }
  }
  return groups
}

// ページに分ける。明細が 1 行もなくても、1 ページは出す（上部の項目を印刷するため）
export function paginateSlipLines(lines: readonly SlipLine[], rowsPerPage = SLIP_ROWS_PER_PAGE): SlipLine[][] {
  const pages: SlipLine[][] = []
  let current: SlipLine[] = []
  for (const group of groupLines(lines)) {
    // まとまりがこのページの残りに入らなければ、次のページから始める（ページが空のときは、そのまま入れる）
    if (current.length > 0 && current.length + group.length > rowsPerPage) {
      pages.push(current)
      current = []
    }
    // 1 ページを超えるまとまりは、途中で分ける
    for (const line of group) {
      if (current.length === rowsPerPage) {
        pages.push(current)
        current = []
      }
      current.push(line)
    }
  }
  pages.push(current)
  return pages
}
