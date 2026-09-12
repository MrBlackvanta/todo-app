# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY TodoApi.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish TodoApi.csproj -c Release -o /app /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .
USER app

ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Default="Data Source=/tmp/todos.db"
EXPOSE 8080

ENTRYPOINT ["dotnet", "TodoApi.dll"]
