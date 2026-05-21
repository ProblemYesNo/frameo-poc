## BUILD STAGE ####################################################################
# Build the API project and its dependencies

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build.stage
WORKDIR /src

COPY frameo-api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

## RUN STAGE ######################################################################
# This is the actual runtime container for the API

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build.stage /app/publish .

EXPOSE 5295
ENV ASPNETCORE_URLS=http://+:5295
ENTRYPOINT ["dotnet", "frameo-api.dll"]

