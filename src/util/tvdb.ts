export default function tvdb(apiKey: string) {
  let token: string | undefined = undefined

  async function login() {
    const tokenRes = await fetch(`https://api4.thetvdb.com/v4/login`, {
      method: 'POST',
      headers: {
        "accept": "application/json",
        "Content-type": "application/json"
      },
      body: JSON.stringify({
        apikey: apiKey
      })
    })

    if (!tokenRes.ok) throw "tvdb token missing"

    const tokenData = await tokenRes.json() as { data: { token: string } }
    token = tokenData.data.token
  }

  async function search(title: string, year: string) {
    if (!token) throw "must run login first to get token"

    const tvtbIdRes = await fetch(`https://api4.thetvdb.com/v4/search?query=${title}&year=${year}`, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    })

    const data = await tvtbIdRes.json() as { data: { tvdb_id: string }[] }
    return data
  }

  return {
    login: login,
    search: search
  }
}
