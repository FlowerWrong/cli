'use strict';

export const typeDef = `
  type <%= name %> {
    <% attributes.forEach(function(attribute, index) { %>
      <%= attribute.fieldName %>: <%= attribute.dataType %><%= (Object.keys(attributes).length - 1) > index ? ',' : '' %>
    <% }) %>
  }
`;
export const resolvers = {
  <%= name %>: {

  }
};
