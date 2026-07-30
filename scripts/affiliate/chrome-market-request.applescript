on run argv
  if (count of argv) is not 4 then error "Expected endpoint base64, OAuth file path, Chrome window ID and tab index"

  set endpointBase64 to item 1 of argv
  set oauthFile to item 2 of argv
  set targetWindowId to (item 3 of argv) as integer
  set targetTabIndex to (item 4 of argv) as integer
  set oauthBase64 to do shell script "/usr/bin/base64 < " & quoted form of oauthFile & " | /usr/bin/tr -d '\\r\\n'"

  tell application "Google Chrome"
    if not (exists window id targetWindowId) then error "Сохранённое окно Chrome недоступно"
    set targetWindow to window id targetWindowId
    if targetTabIndex > (count of tabs of targetWindow) then error "Сохранённая вкладка Chrome недоступна"
    set targetTab to tab targetTabIndex of targetWindow
    if (URL of targetTab) does not start with "https://api.content.market.yandex.ru/" then
      error "В сохранённой вкладке нет api.content.market.yandex.ru"
    end if

    set jsCode to "(()=>{const root=document.documentElement;const key='data-codex-affiliate-result';root.setAttribute(key,'pending');fetch(atob('" & endpointBase64 & "'),{headers:{Authorization:'OAuth '+atob('" & oauthBase64 & "')}}).then(async response=>{const body=await response.text();root.setAttribute(key,JSON.stringify({status:response.status,ok:response.ok,body}))}).catch(error=>{root.setAttribute(key,JSON.stringify({status:0,ok:false,error:String(error)}))});return 'started'})()"
    execute targetTab javascript jsCode

    repeat 80 times
      delay 0.25
      set resultText to execute targetTab javascript "document.documentElement.getAttribute('data-codex-affiliate-result') || ''"
      if resultText is not "" and resultText is not "pending" then
        execute targetTab javascript "document.documentElement.removeAttribute('data-codex-affiliate-result');'cleared'"
        return resultText
      end if
    end repeat
  end tell

  error "Яндекс Маркет не ответил через Chrome за 20 секунд"
end run
