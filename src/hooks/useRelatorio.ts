import { useQuery } from "@tanstack/react-query";
import {
  SensitivaRelatorioResponse,
  VibracaoRelatorioResponse,
  UltrasomRelatorioResponse,
} from "@/types/vibracao";

const DEFAULT_API_BASE_URL = "https://ayfkjjdgrbymmlkuzbig.supabase.co/functions/v1";

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const API_BASE_URLS = Array.from(
  new Set(
    [import.meta.env.VITE_API_URL, "/api", DEFAULT_API_BASE_URL]
      .filter((baseUrl): baseUrl is string => Boolean(baseUrl))
      .map(normalizeBaseUrl),
  ),
);

const buildEndpointUrl = (baseUrl: string, endpoint: string, idRelatorio: string) => {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${endpoint}`, window.location.origin);
  url.searchParams.set("id_relatorio", idRelatorio);
  return url.toString();
};

const fetchJsonFromCandidates = async <T>(
  endpoint: string,
  idRelatorio: string,
  isValidResponse: (data: T) => boolean,
): Promise<T | null> => {
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(buildEndpointUrl(baseUrl, endpoint, idRelatorio), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        continue;
      }

      const data = (await response.json()) as T;
      if (isValidResponse(data)) {
        return data;
      }
    } catch (error) {
      console.warn(`Erro ao buscar ${endpoint} em ${baseUrl}`, error);
    }
  }

  return null;
};

export type RelatorioResponse =
  | SensitivaRelatorioResponse
  | VibracaoRelatorioResponse
  | UltrasomRelatorioResponse;

export const fetchRelatorio = async (idRelatorio: string): Promise<RelatorioResponse> => {
  const sensitivaData = await fetchJsonFromCandidates<SensitivaRelatorioResponse>(
    "/get-relatorio-sensitiva",
    idRelatorio,
    (data) => Boolean(data.relatorio) && Array.isArray(data.sensitivas),
  );
  if (sensitivaData) {
    return sensitivaData;
  }

  const ultrasomData = await fetchJsonFromCandidates<UltrasomRelatorioResponse>(
    "/get-relatorio-ultrassom",
    idRelatorio,
    (data) => Boolean(data.relatorio?.ultrassom),
  );
  if (ultrasomData) {
    return ultrasomData;
  }

  const vibracaoData = await fetchJsonFromCandidates<VibracaoRelatorioResponse>(
    "/get-vibracao",
    idRelatorio,
    (data) => Boolean(data.success),
  );
  if (vibracaoData) {
    return vibracaoData;
  }

  throw new Error(
    "Nao foi possivel carregar o relatorio pela API configurada. No Coolify, defina VITE_API_URL no build ou publique um proxy para /api.",
  );
};

export const useRelatorio = (idRelatorio: string | null) => {
  return useQuery({
    queryKey: ["relatorio", idRelatorio],
    queryFn: () => fetchRelatorio(idRelatorio!),
    enabled: !!idRelatorio,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
