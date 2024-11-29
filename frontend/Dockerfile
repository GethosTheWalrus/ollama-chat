# Use the official NGINX image as the base image
FROM nginx:latest

# Copy the static files (HTML, CSS, JS) into the container
COPY ./ /usr/share/nginx/html/

COPY ./default.conf /etc/nginx/conf.d/default.conf

# Expose port 80 to serve the frontend
EXPOSE 80
