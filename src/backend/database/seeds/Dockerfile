FROM postgres:15-alpine

WORKDIR /seeds

# Copy SQL scripts
COPY mock_data.sql /seeds/
COPY init_relations.sql /seeds/

# Copy entrypoint script
COPY seed-entrypoint.sh /seeds/
RUN chmod +x /seeds/seed-entrypoint.sh

ENTRYPOINT ["/seeds/seed-entrypoint.sh"]

