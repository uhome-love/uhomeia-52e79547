UPDATE pipeline_leads SET negocio_id = NULL WHERE negocio_id = 'b98dd456-b70f-4d7c-aa2d-73be3209726d';
DELETE FROM lead_progressao WHERE negocio_id = 'b98dd456-b70f-4d7c-aa2d-73be3209726d';
DELETE FROM pos_vendas WHERE negocio_id = 'b98dd456-b70f-4d7c-aa2d-73be3209726d';
DELETE FROM negocios WHERE id = 'b98dd456-b70f-4d7c-aa2d-73be3209726d';