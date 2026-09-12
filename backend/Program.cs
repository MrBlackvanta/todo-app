using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ITodoService, TodoService>();
builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseNpgsql(DatabaseConnection.Resolve(builder.Configuration))
);
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddDbContextCheck<TodoDbContext>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }
        )
    );
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()
    );
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseHttpsRedirection();
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseRateLimiter();

app.MapHealthChecks("/health").DisableRateLimiting();

app.MapGet(
        "/lists/{id:guid}",
        async (Guid id, ITodoService todos, CancellationToken token) =>
        {
            var list = await todos.GetAsync(id, token);

            return list is null
                ? Results.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "List not found",
                    detail: $"No list with id {id}."
                )
                : Results.Ok(list);
        }
    )
    .WithName("GetList")
    .WithSummary("Read one todo list by its id.")
    .WithDescription(
        "Returns the list's items in their stored order. The id is the opaque identifier the "
            + "client generated for itself; there are no accounts. Returns 404 ProblemDetails "
            + "when the id is unknown."
    )
    .WithTags("Lists")
    .Produces<TodoListDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);

app.MapPut(
        "/lists/{id:guid}",
        async (
            Guid id,
            SaveTodoListRequest request,
            ITodoService todos,
            CancellationToken token
        ) =>
        {
            var rejection = TodoValidation.Reject(request);

            return rejection is not null
                ? Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid list",
                    detail: rejection
                )
                : Results.Ok(await todos.SaveAsync(id, request.Items, token));
        }
    )
    .WithName("SaveList")
    .WithSummary("Replace a todo list with the snapshot in the request body.")
    .WithDescription(
        "Creates the list when the id is new and overwrites it otherwise. Array order is the "
            + "stored order, so a reorder is just a different array. The client is the single "
            + "writer and holds the authoritative copy, so the newest snapshot always wins."
    )
    .WithTags("Lists")
    .Produces<TodoListDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status400BadRequest);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TodoDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.Run();
