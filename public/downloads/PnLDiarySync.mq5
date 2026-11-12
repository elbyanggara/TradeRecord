//+------------------------------------------------------------------+
//|                                               PnLDiarySync.mq5   |
//|                                    PnL Diary — Auto-Sync EA MT5  |
//|                                    https://pnl-diary.vercel.app  |
//+------------------------------------------------------------------+
#property copyright "PnL Diary"
#property link      "https://pnl-diary.vercel.app"
#property version   "1.00"
#property description "Otomatis mencatat setiap transaksi close dari EA/manual MT5 ke PnL Diary."

input string InpWebhookUrl    = "https://pnl-diary.vercel.app/api/integrations/mt5"; // Webhook URL PnL Diary
input string InpApiKey        = "";       // API Key dari halaman /profile PnL Diary
input long   InpMagicFilter   = 0;        // Filter Magic Number (0 = semua EA & manual)
input bool   InpSendPingOnInit = true;    // Cek koneksi ke server saat EA dipasang

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(InpApiKey) < 16)
   {
      Alert("PnLDiarySync: Isi InpApiKey terlebih dahulu dari halaman /profile di PnL Diary.");
      return(INIT_PARAMETERS_INCORRECT);
   }

   if(InpSendPingOnInit)
   {
      char post[];
      char result[];
      string resultHeaders;
      ResetLastError();
      int res = WebRequest("GET", InpWebhookUrl, "", 5000, post, result, resultHeaders);
      if(res == -1)
      {
         int err = GetLastError();
         Print("PnLDiarySync: Gagal koneksi awal (Error ", err, "). Pastikan URL ",
               InpWebhookUrl, " sudah ditambahkan di Tools -> Options -> Expert Advisors -> Allow WebRequest.");
      }
      else
      {
         Print("PnLDiarySync: Koneksi ke PnL Diary OK (HTTP ", res, "). Siap mencatat deal close.");
      }
   }

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Trade transaction handler                                        |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0)
      return;

   // Beri jeda singkat agar history deal siap dibaca di terminal
   Sleep(250);
   if(!HistoryDealSelect(dealTicket))
   {
      HistorySelect(TimeCurrent() - 86400, TimeCurrent() + 60);
      if(!HistoryDealSelect(dealTicket))
         return;
   }

   long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT)
      return;

   long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
      return;

   long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   if(InpMagicFilter != 0 && magic != InpMagicFilter)
      return;

   string symbol      = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double volume      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double closePrice  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double swap        = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   double commission  = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double netPnL      = profit + swap + commission;
   datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   long posId         = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   string comment     = HistoryDealGetString(dealTicket, DEAL_COMMENT);

   // Deal close SELL berarti posisi aslinya BUY (long), dan sebaliknya
   string direction = (dealType == DEAL_TYPE_SELL) ? "long" : "short";

   // Cari harga entry dari deal pembuka posisi
   double entryPrice = 0.0;
   if(posId > 0 && HistorySelectByPosition(posId))
   {
      int total = HistoryDealsTotal();
      for(int i = 0; i < total; i++)
      {
         ulong t = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
         {
            entryPrice = HistoryDealGetDouble(t, DEAL_PRICE);
            break;
         }
      }
   }

   string akunMode = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL) ? "Real" : "Demo";
   long accNumber  = AccountInfoInteger(ACCOUNT_LOGIN);

   MqlDateTime dt;
   TimeToStruct(closeTime, dt);
   string dateStr = StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day);

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double prevBalance = balance - netPnL;
   string pctJson = "null";
   if(prevBalance > 0.0)
   {
      double pct = (netPnL / prevBalance) * 100.0;
      pctJson = DoubleToString(pct, 2);
   }

   string entryJson = (entryPrice > 0.0) ? DoubleToString(entryPrice, 5) : "null";
   string cleanComment = EscapeJson(comment);
   string noteText = StringFormat("MT5 #%I64u | Magic %I64d%s",
                                  dealTicket,
                                  magic,
                                  (StringLen(cleanComment) > 0 ? " | " + cleanComment : ""));

   string payload = StringFormat(
      "{\"deal_id\":\"%I64u\",\"account_number\":\"%I64d\",\"tanggal\":\"%s\",\"akun\":\"%s\",\"instrumen\":\"%s\",\"arah\":\"%s\",\"entry\":%s,\"exit\":%.5f,\"lot\":%.2f,\"pnl_nominal\":%.2f,\"pnl_persen\":%s,\"catatan\":\"%s\"}",
      dealTicket,
      accNumber,
      dateStr,
      akunMode,
      EscapeJson(symbol),
      direction,
      entryJson,
      closePrice,
      volume,
      netPnL,
      pctJson,
      noteText
   );

   SendToWebhook(payload, dealTicket);
}

//+------------------------------------------------------------------+
//| Helper kirim HTTP POST JSON ke PnL Diary                         |
//+------------------------------------------------------------------+
void SendToWebhook(const string jsonBody, const ulong dealTicket)
{
   char postData[];
   int len = StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0)
      ArrayResize(postData, len - 1); // Hapus null-terminator agar JSON valid

   string headers = "Content-Type: application/json\r\n" +
                    "Authorization: Bearer " + InpApiKey + "\r\n";
   char result[];
   string resultHeaders;

   ResetLastError();
   int status = WebRequest("POST", InpWebhookUrl, headers, 10000, postData, result, resultHeaders);
   string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);

   if(status >= 200 && status < 300)
   {
      Print("PnLDiarySync: Deal #", dealTicket, " tersinkron (HTTP ", status, "): ", body);
   }
   else
   {
      Print("PnLDiarySync: Gagal kirim Deal #", dealTicket, " (HTTP ", status, ", Err ", GetLastError(), "): ", body);
   }
}

//+------------------------------------------------------------------+
//| Escape karakter khusus JSON                                      |
//+------------------------------------------------------------------+
string EscapeJson(string text)
{
   StringReplace(text, "\\", "\\\\");
   StringReplace(text, "\"", "\\\"");
   StringReplace(text, "\r", " ");
   StringReplace(text, "\n", " ");
   return text;
}
//+------------------------------------------------------------------+

