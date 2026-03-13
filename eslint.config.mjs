import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // React best practices
      "react/no-array-index-key": "warn",
      "react/self-closing-comp": "error",

      // Import hygiene (avoid barrel imports)
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/lib/services/**/index"],
              message:
                "Import directly from the module file, not barrel exports.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/", "node_modules/", "supabase/"],
  },
];

export default eslintConfig;
