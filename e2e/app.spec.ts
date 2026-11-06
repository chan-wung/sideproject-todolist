import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// 실제 브라우저에서 확인하는 핵심 흐름. 데이터는 모두 가상의 값이고, 테스트마다 새 브라우저 컨텍스트(빈 저장소)로 시작한다.

const todoField = (page: Page) => page.getByRole('textbox', { name: '할 일 내용' })

const todo = (page: Page, text: string) => page.locator('.todo-item__txt', { hasText: text })

// 문서 가로 폭이 화면 폭을 넘지 않는다. 실패하면 화면 밖으로 나간 요소를 메시지에 보여 준다 (환경마다 글꼴이 달라 원인을 바로 알 수 있게).
async function expectNoHorizontalOverflow(page: Page, width: number) {
  const { scrollWidth, offenders } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll('body *'))
      .filter(el => el.getBoundingClientRect().right > window.innerWidth + 0.5)
      .slice(0, 6)
      .map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} right=${Math.round(el.getBoundingClientRect().right)}`),
  }))
  expect(scrollWidth, `넘친 요소: ${offenders.join(' | ')}`).toBeLessThanOrEqual(width)
}

async function addTodo(page: Page, text: string) {
  await todoField(page).fill(text)
  await todoField(page).press('Enter')
  await expect(todo(page, text)).toBeVisible()
}

test.describe('할 일 CRUD와 새로고침', () => {
  test('추가한 할 일은 새로고침해도 남고, 삭제하면 사라진다', async ({ page }) => {
    await page.goto('/todos')
    await addTodo(page, 'E2E 보고서 작성')

    await page.reload()
    await expect(todo(page, 'E2E 보고서 작성')).toBeVisible()

    await page.getByRole('button', { name: '삭제', exact: true }).first().click()
    await page.locator('dialog.confirm-modal').getByRole('button', { name: '삭제' }).click()
    await expect(todo(page, 'E2E 보고서 작성')).toHaveCount(0)

    await page.reload()
    await expect(todo(page, 'E2E 보고서 작성')).toHaveCount(0)
  })

  test('완료하면 진행 중 목록에서 빠지고 새로고침해도 유지된다', async ({ page }) => {
    await page.goto('/todos')
    await addTodo(page, 'E2E 완료할 일')
    await page.locator('.todo-item__check').first().click()
    await expect(todo(page, 'E2E 완료할 일')).toHaveCount(0) // 기본 필터는 진행 중

    await page.reload()
    await expect(todo(page, 'E2E 완료할 일')).toHaveCount(0)
  })
})

test.describe('쓰던 글 보존', () => {
  test('할 일 입력창에 쓰던 글은 다른 화면에 다녀와도 남는다', async ({ page }) => {
    await page.goto('/todos')
    await todoField(page).fill('쓰다 만 글')

    await page.getByRole('link', { name: '메모장' }).first().click()
    await expect(page).toHaveURL(/\/memo$/)
    await page.getByRole('link', { name: '할 일' }).first().click()

    await expect(todoField(page)).toHaveValue('쓰다 만 글')
  })
})

test.describe('한글 입력(IME)', () => {
  test('조합 중 Enter는 등록하지 않고, 확정한 뒤 Enter는 등록한다', async ({ page }) => {
    await page.goto('/todos')
    await todoField(page).click()
    const cdp = await page.context().newCDPSession(page)

    await cdp.send('Input.imeSetComposition', { text: '한', selectionStart: 1, selectionEnd: 1 })
    await page.keyboard.press('Enter') // 조합 중
    await expect(page.locator('.todo-list__item')).toHaveCount(0)

    // 실제 IME는 조합 중 Enter를 삼키지만 CDP로 흉내 낸 Enter는 줄바꿈이 남는다. 여기서는 "등록되지 않는다"만 본다.
    await todoField(page).fill('한') // 조합이 끝난 상태
    await page.keyboard.press('Enter')
    await expect(page.locator('.todo-list__item')).toHaveCount(1)
  })
})

test.describe('백업 왕복', () => {
  test('내보낸 파일을 저장소를 비운 뒤 가져오면 할 일이 돌아온다', async ({ page }, testInfo) => {
    await page.goto('/todos')
    await addTodo(page, 'E2E 백업 업무')

    const profile = page.locator('.profile-menu--nav')
    await profile.getByTitle('프로필 메뉴').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      profile.getByRole('button', { name: '내보내기', exact: true }).click(),
    ])
    const file = testInfo.outputPath('backup.json')
    await download.saveAs(file)
    expect(JSON.parse(readFileSync(file, 'utf-8')).todos).toHaveLength(1)

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(todo(page, 'E2E 백업 업무')).toHaveCount(0)

    await page.locator('input[type="file"]').first().setInputFiles(file)
    const dialog = page.locator('dialog.confirm-modal')
    await expect(dialog).toContainText('할 일 1건')
    await dialog.getByRole('button', { name: '가져오기' }).click()

    await expect(todo(page, 'E2E 백업 업무')).toBeVisible()
    await page.reload()
    await expect(todo(page, 'E2E 백업 업무')).toBeVisible()
  })
})

test.describe('오프라인 재시작', () => {
  test('한 번 접속한 뒤에는 오프라인에서도 앱이 열리고 직접 주소도 열린다', async ({ page, context }) => {
    await page.goto('/todos')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload() // 서비스 워커가 화면을 맡게 한다
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await addTodo(page, 'E2E 오프라인 업무')

    await context.setOffline(true)
    await page.reload()
    await expect(todo(page, 'E2E 오프라인 업무')).toBeVisible()

    await page.goto('/report') // 경로로 바로 들어가도 index.html로 처리된다
    await expect(page.getByRole('heading', { name: '주간보고', level: 1 })).toBeVisible()
  })
})

test.describe('두 탭 충돌', () => {
  test('한 탭이 데이터를 바꾸면 다른 탭은 덮어쓰지 않고 안내를 띄운다', async ({ context }) => {
    const a = await context.newPage()
    const b = await context.newPage()
    await a.goto('/todos')
    await b.goto('/todos')

    await addTodo(a, 'E2E A탭 업무')

    // B는 같은 저장소의 변경을 실제 storage 이벤트로 알게 된다
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toBeVisible()
    await b.getByRole('button', { name: '다른 탭 내용 불러오기' }).click()
    await expect(todo(b, 'E2E A탭 업무')).toBeVisible()
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toHaveCount(0)
  })

  test('이 탭의 내용으로 계속하면 안내가 사라지고 이후 저장된다', async ({ context }) => {
    const a = await context.newPage()
    const b = await context.newPage()
    await a.goto('/todos')
    await b.goto('/todos')

    await addTodo(a, 'E2E A탭 업무')
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toBeVisible()

    await b.getByRole('button', { name: '이 탭 내용으로 계속' }).click()
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toHaveCount(0)
    await addTodo(b, 'E2E B탭 업무')

    await b.reload()
    await expect(todo(b, 'E2E B탭 업무')).toBeVisible()
  })

  test('편집 없이 이 탭의 내용으로 계속해도 새로고침 뒤 이 탭 내용이 남는다', async ({ context }) => {
    const a = await context.newPage()
    const b = await context.newPage()
    await a.goto('/todos')
    await b.goto('/todos')
    await addTodo(a, 'E2E 먼저 쓴 탭 업무') // 이 탭(b)은 비어 있는 채로 알림만 받는다
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toBeVisible()

    await b.getByRole('button', { name: '이 탭 내용으로 계속' }).click() // 추가 편집 없이 선택
    await expect(b.getByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toHaveCount(0)

    await b.reload()
    await expect(todo(b, 'E2E 먼저 쓴 탭 업무')).toHaveCount(0) // 이 탭의 내용(빈 목록)이 저장됐다
  })
})

test.describe('좁은 화면과 동작 줄이기', () => {
  test('320px 화면에서 기간 선택 팝업이 화면 밖으로 넘치지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/todos')
    // 팝업을 열기 전에도 필터·정렬 막대 등이 화면 밖으로 넘치지 않는다 (글꼴이 다른 환경에서도 같아야 한다)
    await expectNoHorizontalOverflow(page, 320)
    await page.getByRole('button', { name: '상세 옵션 열기' }).click()
    await page.locator('.date-range-picker__input').first().click()

    const dropdown = page.locator('.date-range-picker__dropdown')
    await expect(dropdown).toBeVisible()
    const box = (await dropdown.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    await expectNoHorizontalOverflow(page, 320)
  })

  test('동작 줄이기를 켜면 컴포넌트 전환이 사실상 꺼지고, 끄면 그대로다', async ({ page }) => {
    const duration = () => todoField(page).evaluate(el => getComputedStyle(el).transitionDuration)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/todos')
    expect(parseFloat(await duration())).toBeLessThan(0.001)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(parseFloat(await duration())).toBeGreaterThanOrEqual(0.3)
  })
})
