## BUILD STAGE ####################################################################
# Build the API project and its dependencies

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build.stage
WORKDIR /src

# Copy project file and restore dependencies (cached layer)
COPY frameo-api.csproj ./

# Restore dependencies (cached layer when .csproj files don't change)
RUN dotnet restore

# Copy remaining source files
COPY . ./
RUN dotnet tool restore

# Create release build of app
RUN dotnet publish -c Release -o /app

## RUN STAGE ######################################################################
# This is the actual runtime container for the API

FROM mcr.microsoft.com/dotnet/aspnet:10.0

# Set the working directory in the container
WORKDIR /app

# Copy the pre-build binary into the container
COPY --from=build.stage /app .

# Expose port 5295 for the application
EXPOSE 5295

ENV ASPNETCORE_URLS=http://+:5295
ENTRYPOINT ["dotnet", "frameo-api.dll"]