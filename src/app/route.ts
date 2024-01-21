import { chromium } from 'playwright'
import { env } from '~/env'
import fs from 'fs'
import tvdb from '~/util/tvdb'

export async function GET() {
  const date = new Date()

  const format = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
  const dir = './data/'

  const file = 'series-' + format
  const path = dir + file

  // check for file as cache
  try {
    const cache = fs.readFileSync(path, 'utf-8')
    const cacheObj = JSON.parse(cache)
    if (cacheObj) {
      return Response.json(JSON.stringify(cacheObj))
    }

  } catch (e) {
    console.log("file does not exist")
  }

  // delete older files
  try {
    const ls = fs.readdirSync(dir)
    ls.forEach(f => {
      if (f.match('series') && f !== file) {
        fs.rmSync(dir + f)
      }
    })
  } catch (e) {
    console.log(e)
  }

  // scrape and save to file then return result
  try {
    const browser = await chromium.launch({ headless: env.NODE_ENV === 'production' ? true : false })
    const page = await browser.newPage()

    await page.goto(
      'https://www.rottentomatoes.com/browse/tv_series_browse/audience:upright~critics:fresh~sort:popular', { waitUntil: 'domcontentloaded' }
    )

    const xpath = 'xpath=//div/tile-dynamic/a/span[1]'
    const titlesLocators = await page.locator(xpath).all()

    let titles: { title: string, year: string, TvdbId?: string }[] = []

    for (const locator of titlesLocators) {
      const title = await locator.textContent()

      await locator.click()
      const year = await page.locator('[data-qa="series-details-premiere-date"]').textContent()
      await page.goBack()

      if (title && year) {
        titles.push({
          title: title.trim(),
          year: year.replace(/.*,/g, '').trim()
        })
      }
    }

    const tvdbApi = tvdb(env.TVDB_API)
    await tvdbApi.login()

    for (let i = 0; i < titles.length; i++) {
      let t = titles[i]

      if (!t) throw "Array bounds incorrect"

      const data = await tvdbApi.search(t.title, t.year)
      const tvtbId = data.data?.[0]?.tvdb_id

      titles[i] = {
        ...t,
        TvdbId: tvtbId
      }
    }

    fs.writeFileSync(path, JSON.stringify(titles))


    await browser.close()

    return Response.json(JSON.stringify(titles))

  } catch (e) {
    console.log(e)

    return new Response(new Blob(), { status: 500 })
  }
}


