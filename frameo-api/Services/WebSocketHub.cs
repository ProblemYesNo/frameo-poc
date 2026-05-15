using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using System.Text;
using System.Threading;
using frameo_api.Models;

namespace frameo_api.Services;

public sealed class WebSocketHub
{
   private readonly ConcurrentDictionary<Guid, WebSocket> _connections = new();

   public async Task AcceptSocketAsync(HttpContext context)
   {
       if(!context.WebSockets.IsWebSocketRequest)
       {
           context.Response.StatusCode = StatusCodes.Status400BadRequest;
           await context.Response.WriteAsync("WebSocket requests only.");
           return;
       }

       using var socket = await context.WebSockets.AcceptWebSocketAsync();
       var connectionId = Guid.NewGuid();
       _connections[connectionId] = socket;

       try
       {
        await ListenUntilCloseAsync(socket);
       }
       finally
       {
           _connections.TryRemove(connectionId, out _);
       }
   }

   public async Task BroadcastNewImageAsync(ImageItem image, CancellationToken cancellationToken = default)
   {
       var payload = JsonSerializer.Serialize(new { type = "image.created", data = image });
       var bytes = Encoding.UTF8.GetBytes(payload);

       foreach (var pair in _connections)
       {
           var socket = pair.Value;
           if (socket.State != WebSocketState.Open)
           {
              _connections.TryRemove(pair.Key, out _);
              continue;
           }

           try
           {
               await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
           }
           catch
           {
              _connections.TryRemove(pair.Key, out _);
           }
       }
   }

   private static async Task ListenUntilCloseAsync(WebSocket socket)
   {
       var buffer = new byte[1024];
       while (socket.State == WebSocketState.Open)
       {
           var result = await socket.ReceiveAsync(buffer, CancellationToken.None);
           if (result.MessageType == WebSocketMessageType.Close)
           {
               await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed", CancellationToken.None);
               break;
           }
       }
   }
}