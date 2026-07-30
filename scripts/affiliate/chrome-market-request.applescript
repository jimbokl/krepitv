on run argv
  if (count of argv) is not 2 then error "Expected endpoint base64 and OAuth file path"

  set endpointBase64 to item 1 of argv
  set oauthFile to item 2 of argv
  set oauthBase64 to do shell script "/usr/bin/base64 < " & quoted form of oauthFile & " | /usr/bin/tr -d '\\r\\n'"
  set targetTab to missing value

  tell application "Google Chrome"
    repeat with browserWindow in windows
      repeat with browserTab in tabs of browserWindow
        if (URL of browserTab) starts with "https://api.content.market.yandex.ru/" then
          set targetTab to browserTab
          exit repeat
        end if
      end repeat
      if targetTab is not missing value then exit repeat
    end repeat

    if targetTab is missing value then
      error "В открытом Chrome нет технической вкладки api.content.market.yandex.ru"
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
